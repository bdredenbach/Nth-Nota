package com.nthexperience.nota;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.*;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;
import org.json.JSONObject;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/** All inference remains in AICore. No key, cloud model or HTTP request is used here. */
final class LocalAI {
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String,Job> jobs=new ConcurrentHashMap<>();
    private final Consumer<JSONObject> emit;
    private GenerativeModelFutures model;
    private volatile boolean foreground=true,closed;
    private static final class Job {final AtomicBoolean cancelled=new AtomicBoolean();volatile Future<?> worker;volatile ListenableFuture<?> inference;}
    LocalAI(Consumer<JSONObject> emit){this.emit=emit;}
    void foreground(boolean value){foreground=value;if(!value)for(String id:jobs.keySet())cancel(id);}
    void request(String id,String action,String json){
        if(id==null||!id.matches("[A-Za-z0-9_-]{1,100}"))return;
        if(closed||!foreground){error(id,"BUSY","Return to Nth Nota to use local assistance.",30000);return;}
        if(jobs.size()>=2||jobs.containsKey(id)){error(id,"BUSY","Local assistance is already working. Try again shortly.",30000);return;}
        final Job job=new Job();jobs.put(id,job);
        job.worker=executor.submit(()->{try{
            if(job.cancelled.get())throw new CancellationException();
            if(model==null)model=GenerativeModelFutures.from(Generation.INSTANCE.getClient());
            int status=await(job,model.checkStatus(),30);
            if(action.equals("status")){send(id,new JSONObject().put("status",statusName(status)));return;}
            if(!action.equals("generate")){error(id,"INVALID_REQUEST","Unknown writing action.",0);return;}
            JSONObject input=new JSONObject(json);String prompt=input.optString("prompt");String task=input.optString("task");
            if(prompt.trim().isEmpty()||prompt.length()>20000||!task.matches("proofread|polish|brainstorm|generate|summarize")){error(id,"INVALID_REQUEST","Use a shorter piece of writing or choose a writing tool.",0);return;}
            if(status==FeatureStatus.UNAVAILABLE){error(id,"UNAVAILABLE","Local AI is not available on this phone yet. Check Android and AICore updates, then try again.",60000);return;}
            if(status==FeatureStatus.DOWNLOADING){error(id,"BUSY","Local AI is downloading. Keep an internet connection and try again shortly.",30000);return;}
            if(status==FeatureStatus.DOWNLOADABLE){
                progress(id,"Preparing offline assistance…",0);
                await(job,model.download(new DownloadCallback(){
                    private long last;
                    @Override public void onDownloadStarted(long bytes){progress(id,"Downloading the local writing assistant…",0);}
                    @Override public void onDownloadProgress(long bytes){if(System.currentTimeMillis()-last>750){last=System.currentTimeMillis();progress(id,"Preparing offline assistance · "+Math.max(1,bytes/1048576)+" MB downloaded",bytes);}}
                    @Override public void onDownloadCompleted(){progress(id,"Local assistant is ready. Working on your request…",0);}
                    @Override public void onDownloadFailed(GenAiException e){}
                }),600);
            }
            if(!foreground||job.cancelled.get())throw new CancellationException();
            GenerateContentRequest.Builder builder=new GenerateContentRequest.Builder(new TextPart(prompt));
            builder.setMaxOutputTokens(512);builder.setTemperature(task.equals("brainstorm")||task.equals("generate")?.65f:.15f);
            GenerateContentRequest request=builder.build();
            if(await(job,model.countTokens(request),30).getTotalTokens()>3000){error(id,"CONTEXT_TOO_LONG","This selection is too long for local assistance. Select a shorter passage and try again.",0);return;}
            progress(id,"Working privately on this phone…",0);
            GenerateContentResponse response=await(job,model.generateContent(request),120);
            if(job.cancelled.get()||!foreground)throw new CancellationException();
            String text=response.getCandidates().isEmpty()?"":response.getCandidates().get(0).getText();
            if(text==null||text.trim().isEmpty()){error(id,"UNAVAILABLE","The local assistant returned no text. Try a clearer or shorter request.",30000);return;}
            send(id,new JSONObject().put("text",text).put("local",true));
        }catch(Throwable raw){Throwable e=raw;while(e instanceof ExecutionException&&e.getCause()!=null)e=e.getCause();
            if(e instanceof InterruptedException||e instanceof CancellationException||job.cancelled.get())error(id,"CANCELLED","Request cancelled. Your notes are unchanged.",0);
            else if(e instanceof TimeoutException)error(id,"TIMEOUT","The local assistant took too long. Try again with a shorter request.",30000);
            else if(e instanceof GenAiException){GenAiException ai=(GenAiException)e;int code=ai.getErrorCode();long delay=30000;try{delay=Math.max(delay,ai.getRetryDelay().toMillis());}catch(Exception ignored){}
                if(code==4||code==11||code==15)error(id,"SAFETY","The local assistant could not complete that request. Rephrase it and try again.",0);
                else if(code==12)error(id,"CONTEXT_TOO_LONG","Select a shorter passage for local assistance.",0);
                else if(code==27)error(id,"RATE_LIMIT","Local assistance needs a battery break. Try again later.",delay);
                else if(code==9||code==30)error(id,"BUSY","Local assistance is busy. Keep Nth Nota open and try again shortly.",delay);
                else if(code==7)error(id,"CANCELLED","Request cancelled.",0);
                else if(code==501)error(id,"UNAVAILABLE","Free some device storage before preparing local assistance.",60000);
                else error(id,"UNAVAILABLE","Local assistance is not ready on this phone. Check Android and AICore updates, then retry.",60000);
            }else error(id,"UNAVAILABLE","Local assistance could not start on this phone. It may need an Android or AICore update.",60000);
        }finally{if(job.inference!=null&&!job.inference.isDone())job.inference.cancel(true);jobs.remove(id,job);}});
    }
    private static <T>T await(Job job,ListenableFuture<T> future,int seconds)throws Exception{job.inference=future;if(job.cancelled.get()){future.cancel(true);throw new CancellationException();}return future.get(seconds,TimeUnit.SECONDS);}
    private void send(String id,JSONObject data){try{data.put("id",id).put("event","result");emit.accept(data);}catch(Exception ignored){}}
    private void progress(String id,String message,long bytes){try{emit.accept(new JSONObject().put("id",id).put("event","progress").put("message",message).put("bytes",bytes));}catch(Exception ignored){}}
    private void error(String id,String code,String message,long delay){try{send(id,new JSONObject().put("error",code).put("message",message).put("retryAt",System.currentTimeMillis()+Math.max(0,delay)));}catch(Exception ignored){}}
    private static String statusName(int status){if(status==FeatureStatus.AVAILABLE)return "ready";if(status==FeatureStatus.DOWNLOADABLE)return "downloadable";if(status==FeatureStatus.DOWNLOADING)return "downloading";return "unavailable";}
    void cancel(String id){Job job=jobs.get(id);if(job==null)return;job.cancelled.set(true);if(job.inference!=null)job.inference.cancel(true);if(job.worker!=null)job.worker.cancel(true);jobs.remove(id,job);error(id,"CANCELLED","Request cancelled. Your notes are unchanged.",0);}
    void close(){closed=true;foreground(false);executor.shutdownNow();if(model!=null)try{model.getGenerativeModel().close();}catch(Exception ignored){}}
}
