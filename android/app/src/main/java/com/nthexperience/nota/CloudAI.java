package com.nthexperience.nota;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.function.Consumer;

/** Fixed owner-operated gateway. Provider secrets never enter this application. */
final class CloudAI {
    private final SharedPreferences preferences;
    private final Consumer<JSONObject> emit;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private final ConcurrentHashMap<String,Job> jobs=new ConcurrentHashMap<>();
    private final String endpoint;
    private volatile boolean foreground=true,closed;
    private static final class Job {volatile HttpURLConnection connection;volatile Future<?> worker;volatile boolean cancelled;}
    CloudAI(Context context,Consumer<JSONObject> emit){this.preferences=context.getSharedPreferences("nota-ai-privacy",Context.MODE_PRIVATE);this.emit=emit;String url=BuildConfig.AI_GATEWAY_URL;this.endpoint=url.matches("https://[a-z0-9][a-z0-9.-]+/v1/write")?url:"";}
    String state(){try{return new JSONObject().put("configured",!endpoint.isEmpty()).put("allowed",allowed()).toString();}catch(Exception e){return "{}";}}
    private boolean allowed(){return !endpoint.isEmpty()&&preferences.getBoolean("cloud-allowed",false);}
    void allow(boolean value){preferences.edit().putBoolean("cloud-allowed",value).apply();if(!value)cancelAll();}
    void foreground(boolean value){foreground=value;if(!value)cancelAll();}
    void request(String id,String json){
        if(id==null||!id.matches("[A-Za-z0-9_-]{1,100}"))return;
        if(!allowed()){error(id,"INVALID_REQUEST","Enable cloud assistance in Settings to send text off this phone.",0);return;}
        if(closed||!foreground||!jobs.isEmpty()){error(id,"BUSY","Keep Nth Nota open and try again shortly.",30000);return;}
        Job job=new Job();jobs.put(id,job);job.worker=executor.submit(()->{try{
            JSONObject input=new JSONObject(json);String task=input.optString("task"),prompt=input.optString("prompt");
            if(prompt.trim().isEmpty()||prompt.length()>16000||!task.matches("proofread|polish|brainstorm|generate|summarize")){error(id,"INVALID_REQUEST","Select a shorter passage and choose a writing tool.",0);return;}
            if(job.cancelled||!foreground||!allowed())throw new CancellationException();
            HttpURLConnection connection=(HttpURLConnection)new URL(endpoint).openConnection();job.connection=connection;
            connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(100000);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Origin","https://appassets.androidplatform.net");
            byte[] body=new JSONObject().put("task",task).put("prompt",prompt).put("consentAccepted",true).toString().getBytes(StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(body.length);
            if(job.cancelled||!allowed())throw new CancellationException();
            try(OutputStream output=connection.getOutputStream()){output.write(body);}
            int status=connection.getResponseCode();InputStream stream=status>=200&&status<300?connection.getInputStream():connection.getErrorStream();if(stream==null)throw new IOException();
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=stream){byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1){if(bytes.size()+count>100000)throw new IOException();bytes.write(buffer,0,count);}}
            if(job.cancelled||!foreground||!allowed())throw new CancellationException();
            JSONObject result=new JSONObject(bytes.toString("UTF-8"));if(status>=200&&status<300){String text=result.optString("text");if(text.trim().isEmpty())throw new IOException();send(id,new JSONObject().put("text",text).put("local",false).put("provider",result.optString("provider","cloud")));}
            else{String code=result.optString("error");if(!code.matches("RATE_LIMIT|BUSY|UNAVAILABLE|TIMEOUT|AUTH|SAFETY|INVALID_REQUEST|CONTEXT_TOO_LONG"))code="UNAVAILABLE";send(id,new JSONObject().put("error",code).put("message",result.optString("message","Free cloud assistance is temporarily unavailable.")).put("retryAt",result.optLong("retryAt",System.currentTimeMillis()+60000)));}
        }catch(Throwable e){if(job.cancelled||e instanceof CancellationException||e instanceof InterruptedException)error(id,"CANCELLED","Request cancelled. Your notes are unchanged.",0);else if(e instanceof SocketTimeoutException)error(id,"TIMEOUT","The free assistant took too long. Try again later.",60000);else error(id,"UNAVAILABLE","Cloud assistance could not connect. Your notes are safe.",60000);}
        finally{if(job.connection!=null)job.connection.disconnect();jobs.remove(id,job);}});
    }
    private void send(String id,JSONObject data){try{emit.accept(data.put("id",id).put("event","result"));}catch(Exception ignored){}}
    private void error(String id,String code,String message,long delay){try{send(id,new JSONObject().put("error",code).put("message",message).put("retryAt",System.currentTimeMillis()+delay));}catch(Exception ignored){}}
    void cancel(String id){Job job=jobs.get(id);if(job==null)return;job.cancelled=true;if(job.connection!=null)job.connection.disconnect();if(job.worker!=null)job.worker.cancel(true);jobs.remove(id,job);error(id,"CANCELLED","Request cancelled. A request already received by a provider may still finish there.",0);}
    private void cancelAll(){for(String id:jobs.keySet())cancel(id);}
    void close(){closed=true;cancelAll();executor.shutdownNow();}
}
