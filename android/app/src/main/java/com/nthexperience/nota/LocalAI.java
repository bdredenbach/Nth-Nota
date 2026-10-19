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
import java.util.function.Function;
/** Stop detaches a request; it never interrupts AICore or cancels its download future. */
final class LocalAI {
 interface Backend {CompletableFuture<Integer> status();CompletableFuture<Void> download(DownloadCallback cb);CompletableFuture<Integer> tokens(String prompt,String task);CompletableFuture<String> generate(String prompt,String task);void close();}
 private static final class MlKitBackend implements Backend {
  private GenerativeModelFutures model;
  private GenerativeModelFutures model(){if(model==null)model=GenerativeModelFutures.from(Generation.INSTANCE.getClient());return model;}
  private static <A,B>CompletableFuture<B> map(ListenableFuture<A> source,Function<A,B> convert){CompletableFuture<B> result=new CompletableFuture<>();source.addListener(()->{try{result.complete(convert.apply(source.get()));}catch(Throwable e){result.completeExceptionally(e);}},Runnable::run);return result;}
  private GenerateContentRequest input(String prompt,String task){GenerateContentRequest.Builder b=new GenerateContentRequest.Builder(new TextPart(prompt));b.setMaxOutputTokens(512);b.setTemperature(task.equals("brainstorm")||task.equals("generate")?.65f:.15f);return b.build();}
  public CompletableFuture<Integer> status(){return map(model().checkStatus(),s->s);}
  public CompletableFuture<Void> download(DownloadCallback cb){return map(model().download(cb),v->null);}
  public CompletableFuture<Integer> tokens(String prompt,String task){return map(model().countTokens(input(prompt,task)),r->(int)r.getTotalTokens());}
  public CompletableFuture<String> generate(String prompt,String task){return map(model().generateContent(input(prompt,task)),r->r.getCandidates().isEmpty()?"":r.getCandidates().get(0).getText());}
  public void close(){if(model!=null)model.getGenerativeModel().close();}
 }
 private final ExecutorService executor=Executors.newSingleThreadExecutor();
 private final ConcurrentHashMap<String,Job> jobs=new ConcurrentHashMap<>();
 private final Consumer<JSONObject> emit;private final Backend backend;private final AtomicBoolean backendClosed=new AtomicBoolean();
 private volatile boolean foreground=true,closed;private volatile String phase="checking";private volatile long downloaded,total;
 private static final class Job {final AtomicBoolean cancelled=new AtomicBoolean(),terminal=new AtomicBoolean();volatile CompletableFuture<?> inFlight;}
 LocalAI(Consumer<JSONObject> emit){this(emit,new MlKitBackend());}
 LocalAI(Consumer<JSONObject> emit,Backend backend){this.emit=emit;this.backend=backend;}
 void foreground(boolean value){foreground=value;if(!value)for(String id:jobs.keySet())cancel(id);}
 synchronized void request(String id,String action,String json){
  if(id==null||!id.matches("[A-Za-z0-9_-]{1,100}"))return;
  if(closed||!foreground){error(id,"BUSY","Return to Nth Nota to use local AI.",30000);return;}
  if(!jobs.isEmpty()){if("status".equals(action)){try{send(id,new JSONObject().put("status",phase.startsWith("download")?"downloading":"busy"));}catch(Exception ignored){}}else error(id,"BUSY","Local AI is still preparing or finishing a stopped request.",10000);return;}
  Job job=new Job();jobs.put(id,job);
  executor.submit(()->{try{
   progress(id,"checking","Checking local AI…",0,0);int status=await(job,backend.status(),30);
   if("status".equals(action)){send(id,new JSONObject().put("status",statusName(status)));return;}
   if(!"generate".equals(action)){error(id,"INVALID_REQUEST","Unknown writing action.",0);return;}
   JSONObject input=new JSONObject(json);String prompt=input.optString("prompt"),task=input.optString("task");
   if(prompt.trim().isEmpty()||prompt.length()>20000||!task.matches("proofread|polish|brainstorm|generate|summarize")){error(id,"INVALID_REQUEST","Use a shorter passage or choose a writing tool.",0);return;}
   if(status==FeatureStatus.UNAVAILABLE){error(id,"UNAVAILABLE","Local AI is unavailable on this phone.",60000);return;}
   if(status==FeatureStatus.DOWNLOADING){progress(id,"download_wait","Android is downloading the local assistant…",0,0);long deadline=System.nanoTime()+TimeUnit.MINUTES.toNanos(10);while(status==FeatureStatus.DOWNLOADING){if(job.cancelled.get())throw new CancellationException();if(System.nanoTime()>deadline)throw new TimeoutException();Thread.sleep(1500);status=await(job,backend.status(),30);}}
   if(status==FeatureStatus.DOWNLOADABLE){
    downloaded=0;total=0;progress(id,"download","Starting the local assistant download…",0,0);
    await(job,backend.download(new DownloadCallback(){private long last;
     @Override public void onDownloadStarted(long bytes){total=Math.max(0,bytes);progress(id,"download","Downloading the local assistant…",0,total);}
     @Override public void onDownloadProgress(long bytes){downloaded=Math.max(downloaded,bytes);if(System.currentTimeMillis()-last>250){last=System.currentTimeMillis();progress(id,"download","Downloading the local assistant…",downloaded,total);}}
     @Override public void onDownloadCompleted(){progress(id,"ready","Download complete. Preparing your reply…",total,total);}
     @Override public void onDownloadFailed(GenAiException e){progress(id,"download_failed","The download could not finish. Checking free alternatives…",downloaded,total);}
    }),600);
   }
   if(!foreground||job.cancelled.get())throw new CancellationException();
   if(await(job,backend.tokens(prompt,task),30)>3000){error(id,"CONTEXT_TOO_LONG","Select a shorter passage for local AI.",0);return;}
   progress(id,"accepted","Local AI received your message.",0,0);progress(id,"processing","Writing a reply on this phone…",0,0);
   String text=await(job,backend.generate(prompt,task),120);
   if(job.cancelled.get()||!foreground)throw new CancellationException();
   if(text==null||text.trim().isEmpty()){error(id,"UNAVAILABLE","Local AI returned no text. Try a clearer request.",30000);return;}
   send(id,new JSONObject().put("text",text).put("local",true));
  }catch(Throwable raw){Throwable e=raw;while((e instanceof ExecutionException||e instanceof CompletionException)&&e.getCause()!=null)e=e.getCause();
   if(job.cancelled.get()||e instanceof CancellationException||e instanceof InterruptedException)error(id,"CANCELLED","Reply stopped. Your notes are unchanged.",0);
   else if(e instanceof TimeoutException)error(id,"TIMEOUT","Local AI is taking too long.",30000);
   else if(e instanceof GenAiException){GenAiException ai=(GenAiException)e;int code=ai.getErrorCode();long delay=30000;try{delay=Math.max(delay,ai.getRetryDelay().toMillis());}catch(Exception ignored){}
    if(code==4||code==11||code==15)error(id,"SAFETY","AI could not complete that request. Rephrase it and try again.",0);
    else if(code==12)error(id,"CONTEXT_TOO_LONG","Select a shorter passage.",0);
    else if(code==7)error(id,"CANCELLED","Reply stopped.",0);
    else error(id,code==27?"RATE_LIMIT":"UNAVAILABLE","Local AI is unavailable right now.",delay);
   }else error(id,"UNAVAILABLE","Local AI could not start on this phone.",60000);
  }finally{CompletableFuture<?> pending=job.inFlight;if(pending!=null&&!pending.isDone())pending.whenComplete((v,e)->release(id,job));else release(id,job);}});
 }
 private <T>T await(Job job,CompletableFuture<T> future,int seconds)throws Exception{job.inFlight=future;T value=future.get(seconds,TimeUnit.SECONDS);if(job.cancelled.get())throw new CancellationException();return value;}
 private void release(String id,Job job){jobs.remove(id,job);closeWhenIdle();}
 private void send(String id,JSONObject data){Job job=jobs.get(id);if(closed||job!=null&&!job.terminal.compareAndSet(false,true))return;try{emit.accept(data.put("id",id).put("event","result"));}catch(Exception ignored){}}
 private void progress(String id,String value,String message,long bytes,long max){phase=value;Job job=jobs.get(id);if(closed||job==null||job.cancelled.get()||job.terminal.get())return;try{emit.accept(new JSONObject().put("id",id).put("event","progress").put("phase",value).put("message",message).put("bytes",bytes).put("totalBytes",max));}catch(Exception ignored){}}
 private void error(String id,String code,String message,long delay){try{send(id,new JSONObject().put("error",code).put("message",message).put("retryAt",System.currentTimeMillis()+delay));}catch(Exception ignored){}}
 private static String statusName(int status){if(status==FeatureStatus.AVAILABLE)return "ready";if(status==FeatureStatus.DOWNLOADABLE)return "downloadable";if(status==FeatureStatus.DOWNLOADING)return "downloading";return "unavailable";}
 void cancel(String id){Job job=jobs.get(id);if(job==null||!job.cancelled.compareAndSet(false,true))return;error(id,"CANCELLED","Reply stopped. Android may finish its model download in the background.",0);}
 private void closeWhenIdle(){if(closed&&jobs.isEmpty()&&backendClosed.compareAndSet(false,true))try{backend.close();}catch(Exception ignored){}}
 synchronized void close(){foreground(false);closed=true;executor.shutdown();closeWhenIdle();}
}
