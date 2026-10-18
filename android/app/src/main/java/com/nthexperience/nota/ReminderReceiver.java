package com.nthexperience.nota;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import org.json.JSONObject;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i){String id=i.getStringExtra("item_id");if(id==null)return;JSONObject r=ReminderStore.takeDue(c,id);if(r==null)return;if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;NotificationManager nm=c.getSystemService(NotificationManager.class);boolean sound=r.optBoolean("sound");String channelId=sound?"nota-reminders-sound":"nota-reminders-quiet";NotificationChannel channel=new NotificationChannel(channelId,sound?"Reminders with sound":"Quiet reminders",NotificationManager.IMPORTANCE_DEFAULT);if(sound)channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());else channel.setSound(null,null);nm.createNotificationChannel(channel);Intent open=new Intent(c,MainActivity.class).putExtra("item_id",id).setData(android.net.Uri.parse("nthnota://open/"+android.net.Uri.encode(id))).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);PendingIntent click=PendingIntent.getActivity(c,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);Notification n=new Notification.Builder(c,channelId).setSmallIcon(R.drawable.ic_note).setContentTitle(r.optString("title","A little reminder")).setContentText(r.optString("body")).setStyle(new Notification.BigTextStyle().bigText(r.optString("body"))).setContentIntent(click).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();nm.notify(id,1,n);}
}
