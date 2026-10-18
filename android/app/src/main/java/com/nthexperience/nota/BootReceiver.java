package com.nthexperience.nota;
import android.content.*;
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i){ReminderStore.reschedule(c);}
}
