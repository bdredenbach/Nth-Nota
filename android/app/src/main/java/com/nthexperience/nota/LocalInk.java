package com.nthexperience.nota;

import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.common.model.RemoteModelManager;
import com.google.mlkit.vision.digitalink.recognition.*;
import com.google.mlkit.vision.digitalink.recognition.Ink.Point;
import org.json.*;
import java.util.function.Consumer;

/** All entry points and task callbacks run on the activity's main thread. */
final class LocalInk {
    private final Consumer<String> sink;private Session active;private boolean foreground=true,closed;
    private static final class Session {final String id;boolean stopped;DigitalInkRecognizer recognizer;Session(String id){this.id=id;} }
    LocalInk(Consumer<String> sink){this.sink=sink;}
    void request(String id,String json){
        if(id==null||!id.matches("[-A-Za-z0-9_]{1,100}"))return;
        if(closed||!foreground){error(id,"UNAVAILABLE","Return to the app to convert your handwriting.");return;}
        if(active!=null){error(id,"BUSY","Another handwriting conversion is still running.");return;}
        final InkInput input;final DigitalInkRecognitionModel model;
        try{input=new InkInput(json);DigitalInkRecognitionModelIdentifier identifier=DigitalInkRecognitionModelIdentifier.fromLanguageTag(input.language);if(identifier==null){error(id,"LANGUAGE","This writing language is not supported. Choose another language.");return;}model=DigitalInkRecognitionModel.builder(identifier).build();}catch(Exception e){error(id,"INVALID","Check the writing language and use a shorter line of handwriting.");return;}
        Session session=new Session(id);active=session;progress(id,"checking","Checking the handwriting language pack…");
        RemoteModelManager manager=RemoteModelManager.getInstance();manager.isModelDownloaded(model).addOnSuccessListener(ready->{if(!live(session))return;if(ready)recognize(session,model,input);else{progress(id,"download","Downloading the handwriting language pack (about 20 MB)… Keep an internet connection. Your strokes stay on this device.");manager.download(model,new DownloadConditions.Builder().build()).addOnSuccessListener(done->{if(live(session))recognize(session,model,input);}).addOnFailureListener(e->fail(session,"DOWNLOAD","The language pack could not download. Check your connection and try again. Your writing is saved."));}}).addOnFailureListener(e->fail(session,"UNAVAILABLE","Could not check the handwriting language pack. Try again."));
    }
    // ML Kit 19 requires preContext even for an empty line; omitting it throws at build().
    static RecognitionContext recognitionContext(){return RecognitionContext.builder().setPreContext("").setWritingArea(new WritingArea(1000,440)).build();}
    private boolean live(Session session){return !closed&&foreground&&!session.stopped&&active==session;}
    private void recognize(Session session,DigitalInkRecognitionModel model,InkInput input){
        if(!live(session))return;
        try{Ink.Builder ink=Ink.builder();long time=0;for(java.util.List<InkInput.Point> points:input.strokes){Ink.Stroke.Builder stroke=Ink.Stroke.builder();long previous=points.get(0).t;for(InkInput.Point p:points){time+=Math.max(1,Math.min(1000,p.t-previous));previous=p.t;stroke.addPoint(Point.create(p.x,p.y,time));}ink.addStroke(stroke.build());time+=100;}
            session.recognizer=DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(model).build());progress(session.id,"recognizing","Reading your handwriting on this device…");
            session.recognizer.recognize(ink.build(),recognitionContext()).addOnSuccessListener(result->{if(!live(session))return;try{JSONArray candidates=new JSONArray();for(var candidate:result.getCandidates()){if(candidates.length()>=5)break;String text=candidate.getText();if(text.length()<=2000)candidates.put(text);}emit(new JSONObject().put("id",session.id).put("event","result").put("candidates",candidates));active=null;}catch(Exception e){fail(session,"UNAVAILABLE","Could not read the words. Try a shorter line.");}}).addOnFailureListener(e->fail(session,"UNAVAILABLE","Could not read these strokes. Try a shorter word or write a little larger.")).addOnCompleteListener(task->{if(session.recognizer!=null){session.recognizer.close();session.recognizer=null;}});
        }catch(Exception e){if(session.recognizer!=null){session.recognizer.close();session.recognizer=null;}fail(session,"UNAVAILABLE","Handwriting conversion is unavailable. Your writing is saved.");}
    }
    private void fail(Session session,String code,String message){if(!live(session))return;active=null;error(session.id,code,message);}
    void cancel(String id){if(active==null||!active.id.equals(id))return;Session session=active;session.stopped=true;active=null;error(id,"CANCELLED","Conversion stopped. Your writing is saved.");/* An SDK-managed model download can finish independently. */}
    void foreground(boolean value){foreground=value;if(!value&&active!=null)cancel(active.id);}
    void close(){if(active!=null)cancel(active.id);closed=true;}
    private void progress(String id,String phase,String message){try{emit(new JSONObject().put("id",id).put("event","progress").put("phase",phase).put("message",message));}catch(JSONException ignored){}}
    private void error(String id,String code,String message){try{emit(new JSONObject().put("id",id).put("event","result").put("error",code).put("message",message));}catch(JSONException ignored){}}
    private void emit(JSONObject data){if(!closed)sink.accept(data.toString());}
}
