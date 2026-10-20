package com.nthexperience.nota;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.function.Consumer;

/** The Play services scanner owns its camera, crop, gallery and cleanup UI. */
final class DocumentScanner {
    static final int REQUEST = 6841, MAX_BYTES = 12 * 1024 * 1024;
    private final Activity activity;
    private final Consumer<JSONObject> events;
    private String job;
    private boolean external, closed;

    DocumentScanner(Activity activity, Consumer<JSONObject> events) {
        this.activity = activity;
        this.events = events;
    }

    synchronized void start(String id) {
        if (closed || id == null || !id.matches("[-A-Za-z0-9_]{1,100}")) return;
        if (job != null || external) { emit(id, "error", "The scanner is already open. Return from it before starting again."); return; }
        job = id;
        try {
            GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
                .setGalleryImportAllowed(true).setPageLimit(20)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_PDF)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL).build();
            GmsDocumentScanning.getClient(options).getStartScanIntent(activity)
                .addOnSuccessListener(sender -> {
                    synchronized (DocumentScanner.this) {
                        if (!current(id)) return;
                        try {
                            external = true;
                            activity.startIntentSenderForResult(sender, REQUEST, null, 0, 0, 0);
                        } catch (Exception e) { external = false; fail(id, "The document scanner could not open. You can still import pictures."); }
                    }
                })
                .addOnFailureListener(e -> fail(id, "Document scanning is unavailable on this phone right now. Google Play services may need an update or a first-use download. You can still import pictures."));
        } catch (Exception e) { fail(id, "Document scanning is unavailable. You can still import pictures."); }
    }

    synchronized boolean result(int request, int code, Intent data) {
        if (request != REQUEST) return false;
        external = false;
        final String id = job;
        if (id == null || closed) return true;
        if (code != Activity.RESULT_OK) { emit(id, "cancelled", "Scan cancelled. Your saved document is kept."); job = null; return true; }
        try {
            GmsDocumentScanningResult result = GmsDocumentScanningResult.fromActivityResultIntent(data);
            GmsDocumentScanningResult.Pdf pdf = result == null ? null : result.getPdf();
            if (pdf == null || pdf.getPageCount() < 1 || pdf.getPageCount() > 20) throw new IllegalArgumentException();
            final Uri uri = pdf.getUri();
            final int pages = pdf.getPageCount();
            new Thread(() -> read(id, uri, pages), "nota-document-scan").start();
        } catch (Exception e) { fail(id, "The scanned PDF could not be read. Your saved document is kept."); }
        return true;
    }

    private void read(String id, Uri uri, int pages) {
        try (InputStream input = activity.getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalArgumentException();
            byte[] buffer = new byte[32768];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (!current(id)) return;
                if (output.size() + count > MAX_BYTES) { fail(id, "This PDF is larger than 12 MB. Try fewer pages or a lower scan quality."); return; }
                output.write(buffer, 0, count);
            }
            byte[] bytes = output.toByteArray();
            if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') throw new IllegalArgumentException();
            String encoded = Base64.encodeToString(bytes, Base64.NO_WRAP);
            send(id, new JSONObject().put("event", "begin").put("pages", pages).put("bytes", bytes.length));
            for (int offset = 0; offset < encoded.length(); offset += 60000) {
                if (!current(id)) return;
                send(id, new JSONObject().put("event", "chunk").put("data", encoded.substring(offset, Math.min(encoded.length(), offset + 60000))));
            }
            synchronized (this) {
                if (!current(id)) return;
                send(id, new JSONObject().put("event", "result"));
                job = null;
            }
        } catch (Exception e) { fail(id, "The scanned PDF could not be read. Your saved document is kept."); }
    }

    private synchronized boolean current(String id) { return !closed && id.equals(job); }
    private synchronized void send(String id, JSONObject data) {
        if (!current(id)) return;
        try { events.accept(data.put("id", id)); } catch (Exception ignored) { }
    }
    private void emit(String id, String event, String message) {
        try { events.accept(new JSONObject().put("id", id).put("event", event).put("message", message)); } catch (Exception ignored) { }
    }
    private synchronized void fail(String id, String message) { if (current(id)) { emit(id, "error", message); job = null; } }
    synchronized void cancel(String id) { if (id != null && id.equals(job)) job = null; }
    synchronized void close() { closed = true; job = null; }
}
