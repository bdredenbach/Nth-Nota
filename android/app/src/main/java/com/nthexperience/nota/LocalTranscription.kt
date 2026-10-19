package com.nthexperience.nota

import android.os.Build
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.system.Os
import android.system.OsConstants
import android.system.ErrnoException
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.common.audio.AudioSource
import com.google.mlkit.genai.speechrecognition.SpeechRecognition
import com.google.mlkit.genai.speechrecognition.SpeechRecognizer
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerOptions
import com.google.mlkit.genai.speechrecognition.SpeechRecognizerResponse
import com.google.mlkit.genai.speechrecognition.speechRecognizerOptions
import com.google.mlkit.genai.speechrecognition.speechRecognizerRequest
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import java.util.concurrent.atomic.AtomicLong
import java.util.function.Consumer
import kotlin.concurrent.atomics.ExperimentalAtomicApi

/** Audio stays local. PCM is paced through a pipe, as required by the speech SDK. */
@OptIn(ExperimentalAtomicApi::class)
class LocalTranscription(directory: File, private val emit: Consumer<JSONObject>) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val transfer = PcmTransfer(directory)
    @Volatile private var foreground = true
    @Volatile private var closed = false
    @Volatile private var active: Session? = null
    private class Session(val id: String, val file: File) {
        val cancelled = AtomicBoolean(false)
        val terminal = AtomicBoolean(false)
        @Volatile var job: Job? = null
        @Volatile var recognizer: SpeechRecognizer? = null
        @Volatile var pipe: Array<ParcelFileDescriptor>? = null
    }
    @Synchronized fun begin(id: String, size: Long): Boolean = !closed && foreground && active == null && transfer.begin(id, size)
    fun append(id: String, chunk: String): Boolean = !closed && foreground && transfer.append(id, chunk)
    @Synchronized fun finish(id: String, language: String): Boolean {
        if (closed || !foreground || active != null) return false
        val file = transfer.take(id) ?: return false
        val session = Session(id, file)
        active = session
        session.job = scope.launch(start = CoroutineStart.LAZY) { transcribe(session, language) }
        session.job!!.start()
        return true
    }
    private fun message(s: Session, event: String, data: JSONObject) {
        if (closed || s.cancelled.get()) return
        if (event == "result" && !s.terminal.compareAndSet(false, true)) return
        if (event == "progress" && s.terminal.get()) return
        runCatching { emit.accept(data.put("id", s.id).put("event", event)) }
    }
    private fun progress(s: Session, phase: String, text: String, bytes: Long = 0, total: Long = 0) =
        message(s, "progress", JSONObject().put("phase", phase).put("message", text).put("bytes", bytes).put("totalBytes", total))
    private suspend fun transcribe(s: Session, tag: String) {
        var feeder: Job? = null
        val feedFailure = AtomicReference<Throwable?>(null)
        val fed = AtomicLong(0)
        try {
            withTimeout(840_000) {
                if (s.cancelled.get() || closed || !foreground) throw CancellationException()
                if (Build.VERSION.SDK_INT < 31) error("Local transcription requires Android 12 or newer.")
                progress(s, "checking", "Checking on-device speech recognition…")
                val locale = Locale.forLanguageTag(tag).takeIf { it.language.isNotEmpty() } ?: Locale.getDefault()
                var status = FeatureStatus.UNAVAILABLE
                for (mode in listOf(SpeechRecognizerOptions.Mode.MODE_ADVANCED, SpeechRecognizerOptions.Mode.MODE_BASIC)) {
                    val recognizer = SpeechRecognition.getClient(speechRecognizerOptions { this.locale = locale; preferredMode = mode })
                    s.recognizer = recognizer
                    status = try { recognizer.checkStatus() } catch (e: Exception) { currentCoroutineContext().ensureActive(); FeatureStatus.UNAVAILABLE }
                    if (status != FeatureStatus.UNAVAILABLE) break
                    recognizer.close(); s.recognizer = null
                }
                val recognizer = s.recognizer ?: error("On-device transcription is unavailable for this phone or language.")
                if (status == FeatureStatus.DOWNLOADING) {
                    progress(s, "download", "Android is downloading the speech model. Keep an internet connection while it prepares.")
                    withTimeout(600_000) { while (status == FeatureStatus.DOWNLOADING) { delay(1500); status = recognizer.checkStatus() } }
                }
                if (status == FeatureStatus.DOWNLOADABLE) {
                    var total = 0L
                    progress(s, "download", "Downloading the on-device speech model…")
                    recognizer.download().collect { update ->
                        when (update) {
                            is DownloadStatus.DownloadStarted -> { total = update.bytesToDownload; progress(s, "download", "Downloading the on-device speech model…", 0, total) }
                            is DownloadStatus.DownloadProgress -> progress(s, "download", "Downloading the on-device speech model…", update.totalBytesDownloaded, total)
                            is DownloadStatus.DownloadFailed -> throw update.e
                            is DownloadStatus.DownloadCompleted -> progress(s, "ready", "Speech model ready. Preparing your audio…")
                        }
                    }
                    status = recognizer.checkStatus()
                }
                if (status != FeatureStatus.AVAILABLE) error("On-device speech recognition is not ready. Try again shortly.")
                currentCoroutineContext().ensureActive()
                val pipe = ParcelFileDescriptor.createPipe(); s.pipe = pipe
                val descriptor = pipe[1].fileDescriptor
                Os.fcntlInt(descriptor, OsConstants.F_SETFL, Os.fcntlInt(descriptor, OsConstants.F_GETFL, 0) or OsConstants.O_NONBLOCK)
                val request = speechRecognizerRequest { audioSource = AudioSource.fromPfd(pipe[0]) }
                val text = StringBuilder()
                var completed = false
                progress(s, "transcribing", "Transcribing on this phone…", 0, s.file.length())
                feeder = scope.launch {
                    try {
                        delay(250)
                        FileInputStream(s.file).use { input ->
                            ParcelFileDescriptor.AutoCloseOutputStream(pipe[1]).use { output ->
                                val buffer = ByteArray(3200); var sent = 0L; val started = SystemClock.elapsedRealtime()
                                while (true) {
                                    ensureActive(); if (s.cancelled.get()) throw CancellationException()
                                    val count = input.read(buffer); if (count < 0) break
                                    var offset = 0
                                    while (offset < count) {
                                        ensureActive()
                                        try { val wrote = Os.write(descriptor, buffer, offset, count - offset); if (wrote > 0) offset += wrote else delay(10) }
                                        catch (e: ErrnoException) { if (e.errno == OsConstants.EAGAIN || e.errno == OsConstants.EINTR) delay(10) else throw e }
                                    }
                                    sent += count; fed.set(sent)
                                    progress(s, "transcribing", "Transcribing on this phone…", sent, s.file.length())
                                    delay((started + sent * 1000 / 32000 - SystemClock.elapsedRealtime()).coerceAtLeast(0))
                                }
                            }
                        }
                        progress(s, "finishing", "Finishing your transcript…")
                        delay(1000)
                        recognizer.stopRecognition()
                    } catch (e: CancellationException) { throw e }
                    catch (e: Exception) { if (!s.cancelled.get()) feedFailure.set(e); runCatching { recognizer.stopRecognition() } }
                }
                withTimeout(s.file.length() * 1000 / 32000 + 90_000) {
                    recognizer.startRecognition(request).collect { response ->
                        when (response) {
                            is SpeechRecognizerResponse.FinalTextResponse -> { if (text.isNotEmpty()) text.append(' '); text.append(response.text); progress(s, "text", text.toString().take(100000)) }
                            is SpeechRecognizerResponse.PartialTextResponse -> progress(s, "partial", (text.toString() + " " + response.text).trim().take(100000))
                            is SpeechRecognizerResponse.ErrorResponse -> throw response.e
                            is SpeechRecognizerResponse.CompletedResponse -> completed = true
                        }
                    }
                }
                if (feedFailure.get() != null || fed.get() < s.file.length()) error("On-device audio processing stopped before the file finished. Please try again.")
                if (!completed || text.isBlank()) error("No speech was recognized. Try a clearer recording or another language.")
                message(s, "result", JSONObject().put("text", text.toString().take(100000)).put("local", true))
            }
        } catch (e: CancellationException) {
            if (!s.cancelled.get() && !closed) message(s, "result", JSONObject().put("error", "TIMEOUT").put("message", "Transcription took too long. Your audio is still saved; try again."))
        } catch (e: Throwable) {
            val known = e is IllegalStateException && e.message?.startsWith("Local transcription") == true || e is IllegalStateException && e.message?.startsWith("On-device") == true || e is IllegalStateException && e.message?.startsWith("No speech") == true
            message(s, "result", JSONObject().put("error", "UNAVAILABLE").put("message", if (known) e.message else "On-device transcription could not finish. Your audio is safe. Try again, or check the selected language."))
        } finally {
            s.pipe?.forEach { runCatching { it.close() } }
            withContext(NonCancellable) {
                feeder?.cancelAndJoin()
                runCatching { s.recognizer?.stopRecognition() }
                runCatching { s.recognizer?.close() }
            }
            s.file.delete()
            synchronized(this) { if (active === s) active = null }
            if (closed) scope.cancel()
        }
    }
    fun cancel(id: String) {
        transfer.cancel(id)
        val s = active?.takeIf { it.id == id } ?: return
        if (!s.cancelled.compareAndSet(false, true)) return
        s.pipe?.forEach { runCatching { it.close() } }
        // The SDK stop method suspends. Cancelling the job reaches its
        // NonCancellable cleanup, which stops and closes the recognizer.
        s.job?.cancel()
    }
    fun foreground(value: Boolean) { foreground = value; if (!value) { transfer.clear(); active?.let { cancel(it.id) } } }
    fun close() { closed = true; foreground(false); if (active == null) scope.cancel() }
}
