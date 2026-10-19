package com.nthexperience.nota;
import org.junit.Test;
import static org.junit.Assert.*;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import org.json.JSONObject;
import java.util.*;
import java.util.concurrent.*;
public class LocalAITest {
 static class Tracked<T> extends CompletableFuture<T>{int cancels;@Override public boolean cancel(boolean interrupt){cancels++;return super.cancel(interrupt);}}
 static class Fake implements LocalAI.Backend {
  volatile int status=FeatureStatus.DOWNLOADABLE,generations,closes;Tracked<Void> download=new Tracked<>();Tracked<String> reply=new Tracked<>();CountDownLatch downloading=new CountDownLatch(1),generating=new CountDownLatch(1);
  public CompletableFuture<Integer> status(){return CompletableFuture.completedFuture(status);}
  public CompletableFuture<Void> download(DownloadCallback cb){cb.onDownloadStarted(1000);cb.onDownloadProgress(500);downloading.countDown();return download;}
  public CompletableFuture<Integer> tokens(String p,String t){return CompletableFuture.completedFuture(20);}
  public CompletableFuture<String> generate(String p,String t){generations++;generating.countDown();return reply;}
  public void close(){closes++;}
 }
 static String input(){return "{\"prompt\":\"Hello\",\"task\":\"brainstorm\"}";}
 static List<JSONObject> events(){return new CopyOnWriteArrayList<>();}
 static void waitFor(java.util.function.BooleanSupplier condition)throws Exception{long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);while(!condition.getAsBoolean()&&System.nanoTime()<end)Thread.sleep(5);assertTrue(condition.getAsBoolean());}
 @Test public void stoppingDownloadNeverInterruptsItAndNeverStartsGeneration()throws Exception{Fake f=new Fake();List<JSONObject> out=events();LocalAI ai=new LocalAI(out::add,f);ai.request("one","generate",input());assertTrue(f.downloading.await(3,TimeUnit.SECONDS));ai.cancel("one");ai.cancel("one");assertEquals(0,f.download.cancels);assertEquals(1,out.stream().filter(e->"CANCELLED".equals(e.optString("error"))).count());f.download.complete(null);ai.close();waitFor(()->f.closes==1);assertEquals(0,f.generations);assertEquals(1,out.stream().filter(e->"result".equals(e.optString("event"))).count());}
 @Test public void stopDuringGenerationIgnoresLateResultAndClosesOnlyWhenIdle()throws Exception{Fake f=new Fake();f.status=FeatureStatus.AVAILABLE;List<JSONObject> out=events();LocalAI ai=new LocalAI(out::add,f);ai.request("one","generate",input());assertTrue(f.generating.await(3,TimeUnit.SECONDS));ai.cancel("one");ai.close();assertEquals(0,f.closes);assertEquals(0,f.reply.cancels);f.reply.complete("Late reply");waitFor(()->f.closes==1);assertFalse(out.stream().anyMatch(e->e.has("text")));}
 @Test public void pendingStoppedWorkIsBusyUntilItFinishesThenRetryWorks()throws Exception{Fake f=new Fake();f.status=FeatureStatus.AVAILABLE;List<JSONObject> out=events();LocalAI ai=new LocalAI(out::add,f);ai.request("one","generate",input());assertTrue(f.generating.await(3,TimeUnit.SECONDS));ai.cancel("one");ai.request("two","generate",input());assertTrue(out.stream().anyMatch(e->"two".equals(e.optString("id"))&&"BUSY".equals(e.optString("error"))));f.reply.complete("Ignored");Thread.sleep(30);f.reply=new Tracked<>();f.reply.complete("Fresh reply");ai.request("three","generate",input());waitFor(()->out.stream().anyMatch(e->"Fresh reply".equals(e.optString("text"))));ai.close();}
 @Test public void realByteCountsAreEmittedWithoutGuessingPercentages()throws Exception{Fake f=new Fake();List<JSONObject> out=events();LocalAI ai=new LocalAI(out::add,f);ai.request("one","generate",input());assertTrue(f.downloading.await(3,TimeUnit.SECONDS));assertTrue(out.stream().anyMatch(e->e.optLong("bytes")==500&&e.optLong("totalBytes")==1000));ai.cancel("one");f.download.complete(null);ai.close();}
}
