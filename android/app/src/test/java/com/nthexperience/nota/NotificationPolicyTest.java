package com.nthexperience.nota;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;
public class NotificationPolicyTest {
 private JSONObject item(long rev,long when,boolean ongoing,boolean fired)throws Exception{return new JSONObject().put("rev",rev).put("when",when).put("ongoing",ongoing).put("fired",fired);}
 @Test public void textEditsUpdateExistingOngoingNotice()throws Exception{assertTrue(NotificationPolicy.updateInPlace(item(10,0,true,true),item(10,0,true,false),100));}
 @Test public void newChoicesAndFutureRemindersAreNewAlerts()throws Exception{assertFalse(NotificationPolicy.updateInPlace(null,item(10,0,true,false),100));assertFalse(NotificationPolicy.updateInPlace(item(10,0,true,true),item(11,0,true,false),100));assertFalse(NotificationPolicy.updateInPlace(item(10,500,true,true),item(10,500,true,false),100));assertFalse(NotificationPolicy.updateInPlace(item(10,0,true,true),item(10,0,false,false),100));}
}
