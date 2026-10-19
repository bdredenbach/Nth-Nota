package com.nthexperience.nota;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import org.json.*;
import java.io.File;
import java.util.function.Consumer;

/** Bundled Latin text model. No photo upload or cloud fallback. */
final class LocalPhotoText {
    private final ImageTransfer transfer;private final Consumer<String> sink;private final Consumer<Runnable> dispatch;
    private volatile Session active;private volatile boolean foreground=true,closed;
    private static final class Session {final String id;volatile boolean stopped;boolean processing;Bitmap bitmap;TextRecognizer recognizer;Session(String id){this.id=id;}}
    LocalPhotoText(File directory,Consumer<String> sink,Consumer<Runnable> dispatch){transfer=new ImageTransfer(directory);this.sink=sink;this.dispatch=dispatch;}
    synchronized boolean begin(String id,long bytes){if(closed||!foreground||active!=null||!transfer.begin(id,bytes))return false;active=new Session(id);return true;}
    synchronized boolean append(String id,String data){return active!=null&&!active.processing&&active.id.equals(id)&&transfer.append(id,data);}
    synchronized boolean finish(String id){if(active==null||active.processing||!active.id.equals(id))return false;File file=transfer.take(id);if(file==null)return false;Session session=active;session.processing=true;dispatch.accept(()->process(session,file));return true;}
    private boolean live(Session s){return !closed&&foreground&&!s.stopped&&active==s;}
    private void process(Session s,File file){
        if(!live(s)){file.delete();return;}try{BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeFile(file.getPath(),bounds);if(bounds.outWidth<=0||bounds.outHeight<=0||bounds.outWidth>2048||bounds.outHeight>2048||(long)bounds.outWidth*bounds.outHeight>4194304)throw new IllegalArgumentException();s.bitmap=BitmapFactory.decodeFile(file.getPath());file.delete();if(s.bitmap==null)throw new IllegalArgumentException();s.recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);emit(s.id,"progress",null,"Reading printed text on this device…");s.recognizer.process(InputImage.fromBitmap(s.bitmap,0)).addOnSuccessListener(result->{if(!live(s))return;try{JSONArray blocks=new JSONArray();int total=0;for(var block:result.getTextBlocks()){String text=block.getText();if(text.length()>10000)text=text.substring(0,10000);if(blocks.length()>=200||total+text.length()>100000)break;total+=text.length();Rect box=block.getBoundingBox();if(box==null)continue;double width=s.bitmap.getWidth(),height=s.bitmap.getHeight();JSONArray rect=new JSONArray().put(clamp(box.left/width)).put(clamp(box.top/height)).put(clamp(box.width()/width)).put(clamp(box.height()/height));blocks.put(new JSONObject().put("text",text).put("box",rect));}sink.accept(new JSONObject().put("id",s.id).put("event","result").put("blocks",blocks).toString());active=null;}catch(Exception e){fail(s,"The text could not be read. Your photo is still saved.");}}).addOnFailureListener(e->fail(s,"Could not read this photo. Try a clearer image of Latin-script printed text.")).addOnCompleteListener(task->release(s));
        }catch(Exception e){file.delete();release(s);fail(s,"This photo could not be processed. Try a smaller JPG or PNG.");}
    }
    private static double clamp(double value){return Math.max(0,Math.min(1,value));}
    private void release(Session s){if(s.recognizer!=null){s.recognizer.close();s.recognizer=null;}if(s.bitmap!=null){s.bitmap.recycle();s.bitmap=null;}}
    private void fail(Session s,String message){if(!live(s))return;active=null;emit(s.id,"result","UNAVAILABLE",message);}
    synchronized void cancel(String id){Session s=active;if(s==null||!s.id.equals(id))return;s.stopped=true;active=null;transfer.cancel(id);emit(id,"result","CANCELLED","Stopped. Your photo is saved.");/* Resources are released only after the in-flight ML task completes. */}
    void foreground(boolean value){foreground=value;Session s=active;if(!value&&s!=null)cancel(s.id);}
    void close(){Session s=active;if(s!=null)cancel(s.id);closed=true;transfer.clear();}
    private void emit(String id,String event,String error,String message){if(closed)return;try{JSONObject data=new JSONObject().put("id",id).put("event",event).put("message",message);if(error!=null)data.put("error",error);sink.accept(data.toString());}catch(JSONException ignored){}}
}
