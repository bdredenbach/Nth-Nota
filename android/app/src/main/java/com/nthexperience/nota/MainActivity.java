package com.nthexperience.nota;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
    static final String HOST="appassets.androidplatform.net", HOME="https://"+HOST+"/assets/www/index.html";
    private static final int PICK=101, SAVE=102, MIC=103, NOTIFICATIONS=104;
    private WebView web; private ValueCallback<Uri[]> chooser; private PermissionRequest microphone;
    private TextToSpeech tts; private volatile boolean ttsReady; private String pendingItem; private boolean webReady;
    private final ExportTransfer transfer=new ExportTransfer();

    @Override public void onCreate(Bundle saved){super.onCreate(saved);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(246,245,240));
        if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());android.graphics.Insets ime=insets.getInsets(WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));return insets;});}
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new DeviceBridge(),"NotaAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){Uri uri=r.getUrl();if(!"https".equals(uri.getScheme())||!HOST.equals(uri.getHost())||uri.getPort()!=-1||!r.getMethod().equals("GET"))return blocked();String path=uri.getPath();if(path==null||!path.startsWith("/assets/www/")||path.contains("..")||path.contains("\\"))return blocked();try{String asset=path.substring("/assets/".length());String mime=mime(asset);WebResourceResponse res=new WebResourceResponse(mime,"UTF-8",getAssets().open(asset));Map<String,String> headers=new HashMap<>();headers.put("X-Content-Type-Options","nosniff");headers.put("Content-Security-Policy","default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");res.setResponseHeaders(headers);return res;}catch(IOException e){return blocked();}}
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(HOME.equals(u.toString()))return false;if(r.isForMainFrame()&&("https".equals(u.getScheme())||"http".equals(u.getScheme()))){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}}return true;}
            @Override public void onPageFinished(WebView v,String url){webReady=HOME.equals(url);openPendingItem();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);try{startActivityForResult(i,PICK);}catch(Exception e){chooser.onReceiveValue(null);chooser=null;notice("No file picker is available.");}return true;}
            @Override public void onPermissionRequest(PermissionRequest p){runOnUiThread(()->{if(!("https://"+HOST).equals(p.getOrigin().toString().replaceAll("/$",""))||!Arrays.asList(p.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)){p.deny();return;}if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)p.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else{if(microphone!=null)microphone.deny();microphone=p;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC);}});}
            @Override public void onPermissionRequestCanceled(PermissionRequest p){if(microphone==p)microphone=null;}
        });
        tts=new TextToSpeech(this,status->{ttsReady=status==TextToSpeech.SUCCESS;});
        pendingItem=getIntent().getStringExtra("item_id");web.loadUrl(HOME);
    }
    static String mime(String path){String p=path.toLowerCase(Locale.ROOT);if(p.endsWith(".js")||p.endsWith(".mjs"))return "text/javascript";if(p.endsWith(".css"))return "text/css";if(p.endsWith(".html"))return "text/html";if(p.endsWith(".png"))return "image/png";if(p.endsWith(".json")||p.endsWith(".webmanifest"))return "application/json";if(p.endsWith(".svg"))return "image/svg+xml";return "application/octet-stream";}
    private static WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
    void notice(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
    void emitExport(boolean ok,String message){runOnUiThread(()->{try{JSONObject d=new JSONObject().put("type","export").put("ok",ok).put("message",message);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('nota-native-event',{detail:"+d+"}))",null);}catch(Exception ignored){}});}
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);pendingItem=i.getStringExtra("item_id");openPendingItem();}
    private void openPendingItem(){if(webReady&&pendingItem!=null){String id=pendingItem;pendingItem=null;web.evaluateJavascript("window.notaOpenItem&&window.notaOpenItem("+JSONObject.quote(id)+")",null);}}
    @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==PICK&&chooser!=null){if(result==RESULT_OK&&data!=null&&data.getClipData()!=null){Uri[] uris=new Uri[data.getClipData().getItemCount()];for(int k=0;k<uris.length;k++)uris[k]=data.getClipData().getItemAt(k).getUri();chooser.onReceiveValue(uris);}else chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));chooser=null;}if(req==SAVE){Uri destination=result==RESULT_OK&&data!=null?data.getData():null;if(destination==null){transfer.clear();emitExport(false,"Save cancelled.");return;}new Thread(()->{try(InputStream in=new FileInputStream(transfer.file);OutputStream out=getContentResolver().openOutputStream(destination,"wt")){if(out==null)throw new IOException("No output stream");byte[] buffer=new byte[65536];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);out.flush();emitExport(true,"File saved.");}catch(Exception e){emitExport(false,"The file could not be saved. Please try another location.");}finally{transfer.clear();}},"nota-export").start();}}
    @Override public void onRequestPermissionsResult(int req,String[] permissions,int[] grants){super.onRequestPermissionsResult(req,permissions,grants);if(req==MIC&&microphone!=null){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)microphone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else microphone.deny();microphone=null;}if(req==NOTIFICATIONS)notice(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED?"Notifications enabled.":"Notifications are off. Enable them in Android settings to receive reminders.");}
    @Override public void onBackPressed(){handleBack();}
    private void handleBack(){web.evaluateJavascript("(function(){if(document.querySelector('.modal')){closeModal();return true;}if(document.querySelector('.desk.fullscreen')){document.querySelector('.desk').classList.remove('fullscreen');return true;}return false;})()",value->{if(!"true".equals(value))finish();});}
    @Override protected void onPause(){web.evaluateJavascript("typeof persistDesk==='function'&&persistDesk()",null);super.onPause();}
    @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(microphone!=null)microphone.deny();if(tts!=null){tts.stop();tts.shutdown();}transfer.clear();web.removeJavascriptInterface("NotaAndroid");web.destroy();super.onDestroy();}

    public class DeviceBridge {
        @JavascriptInterface public String beginExport(String name,String mime,long size){return transfer.begin(name,mime,size);}
        @JavascriptInterface public boolean appendExport(String id,String base64){return transfer.append(id,base64);}
        @JavascriptInterface public boolean finishExport(String id){return transfer.finish(id);}
        @JavascriptInterface public void cancelExport(String id){if(id!=null&&id.equals(transfer.id))transfer.clear();}
        @JavascriptInterface public void syncReminders(String json){if(json!=null&&json.length()<1000000)ReminderStore.sync(MainActivity.this,json);}
        @JavascriptInterface public String getReminders(){return ReminderStore.all(MainActivity.this).toString();}
        @JavascriptInterface public void requestNotifications(){runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFICATIONS);else notice("Notifications are available. Check the app notification channels in Android settings if alerts are silent.");});}
        @JavascriptInterface public void stopSpeaking(){runOnUiThread(()->{if(tts!=null)tts.stop();});}
        @JavascriptInterface public void speak(String text,float rate){if(text==null||text.length()>200000)return;runOnUiThread(()->{if(!ttsReady){notice("The speech engine is still starting. Try again in a moment.");return;}Set<Voice> voices=tts.getVoices();Voice chosen=null;if(voices!=null)for(Voice voice:voices){if(!voice.isNetworkConnectionRequired()&&(voice.getFeatures()==null||!voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))&&voice.getLocale().getLanguage().equals(Locale.getDefault().getLanguage())){chosen=voice;break;}}if(chosen==null){notice("Install an offline text-to-speech voice in Android settings to use readback.");return;}tts.stop();tts.setVoice(chosen);tts.setSpeechRate(Math.max(.5f,Math.min(2f,rate)));int max=Math.max(100,TextToSpeech.getMaxSpeechInputLength()-50);for(int i=0;i<text.length();i+=max)tts.speak(text.substring(i,Math.min(text.length(),i+max)),TextToSpeech.QUEUE_ADD,null,"nota-"+i);});}
    }
    private class ExportTransfer {
        String id,name,type;File file;OutputStream output;long expected,written;
        synchronized String begin(String requested,String mime,long size){if(id!=null||size<0||size>80L*1024*1024)return "";try{name=(requested==null?"Nth-Nota":requested).replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]","-");if(name.length()>180)name=name.substring(name.length()-180);type=mime!=null&&mime.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+")?mime:"application/octet-stream";file=File.createTempFile("nota-export-",".tmp",getCacheDir());output=new FileOutputStream(file);expected=size;written=0;id=UUID.randomUUID().toString();return id;}catch(Exception e){clear();return "";}}
        synchronized boolean append(String token,String base64){if(id==null||!id.equals(token)||output==null||base64==null||base64.length()>300000)return false;try{byte[] data=Base64.decode(base64,Base64.NO_WRAP);if(written+data.length>expected)return false;output.write(data);written+=data.length;return true;}catch(Exception e){return false;}}
        synchronized boolean finish(String token){if(id==null||!id.equals(token)||written!=expected)return false;try{output.close();output=null;runOnUiThread(()->{try{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(i,SAVE);}catch(Exception e){clear();emitExport(false,"No system save picker is available.");}});return true;}catch(IOException e){clear();return false;}}
        synchronized void clear(){try{if(output!=null)output.close();}catch(IOException ignored){}if(file!=null)file.delete();id=null;file=null;output=null;}
    }
}
