package com.nthexperience.nota;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
import java.util.*;

final class ReminderStore {
    private static final String PREFS="nota-reminders", KEY="scheduled";
    static synchronized JSONArray all(Context c){try{return new JSONArray(c.getSharedPreferences(PREFS,0).getString(KEY,"[]"));}catch(JSONException e){return new JSONArray();}}
    static synchronized void write(Context c,JSONArray a){c.getSharedPreferences(PREFS,0).edit().putString(KEY,a.toString()).commit();}
    static PendingIntent pending(Context c,String id){Intent i=new Intent(c,ReminderReceiver.class).setAction("com.nthexperience.nota.REMIND").setData(Uri.parse("nthnota://reminder/"+Uri.encode(id))).putExtra("item_id",id);return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void schedule(Context c,JSONObject r){if(r.optBoolean("fired"))return;long when=r.optLong("when");if(when<=0)return;AlarmManager manager=c.getSystemService(AlarmManager.class);manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,Math.max(System.currentTimeMillis()+1000,when),pending(c,r.optString("id")));}
    static void cancel(Context c,String id){c.getSystemService(AlarmManager.class).cancel(pending(c,id));}
    static synchronized void sync(Context c,String json){try{JSONArray incoming=new JSONArray(json);if(incoming.length()>3000)return;JSONArray old=all(c),next=new JSONArray();Map<String,JSONObject> previous=new HashMap<>();for(int i=0;i<old.length();i++){JSONObject r=old.getJSONObject(i);previous.put(r.optString("id"),r);}for(int i=0;i<incoming.length();i++){JSONObject r=incoming.getJSONObject(i);String id=r.optString("id");if(!id.matches("[A-Za-z0-9_-]{1,100}")||r.optLong("when")<=0)continue;JSONObject was=previous.remove(id);if(was!=null&&r.optLong("when")==was.optLong("sourceWhen")){r.put("when",was.optLong("when"));r.put("sourceWhen",was.optLong("sourceWhen"));r.put("fired",was.optBoolean("fired")||r.optBoolean("fired"));}else r.put("sourceWhen",r.optLong("when"));boolean same=was!=null&&r.optLong("when")==was.optLong("when")&&r.optString("title").equals(was.optString("title"))&&r.optString("body").equals(was.optString("body"))&&r.optString("repeat").equals(was.optString("repeat"))&&r.optBoolean("sound")==was.optBoolean("sound")&&r.optBoolean("fired")==was.optBoolean("fired");if(same){next.put(was);continue;}next.put(r);cancel(c,id);schedule(c,r);}for(String id:previous.keySet())cancel(c,id);write(c,next);}catch(Exception ignored){}}
    static synchronized JSONObject takeDue(Context c,String id){JSONArray a=all(c);JSONObject delivered=null;for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r==null||!id.equals(r.optString("id"))||r.optBoolean("fired")||r.optLong("when")>System.currentTimeMillis()+1000)continue;try{delivered=new JSONObject(r.toString());String repeat=r.optString("repeat");if(repeat.equals("daily")||repeat.equals("weekly")){Calendar date=Calendar.getInstance();date.setTimeInMillis(r.optLong("when"));do{date.add(Calendar.DAY_OF_YEAR,repeat.equals("daily")?1:7);}while(date.getTimeInMillis()<=System.currentTimeMillis());r.put("when",date.getTimeInMillis());schedule(c,r);}else r.put("fired",true);}catch(JSONException ignored){}break;}write(c,a);return delivered;}
    static synchronized void reschedule(Context c){JSONArray a=all(c);for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r!=null)schedule(c,r);}}
}
