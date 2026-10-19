package com.nthexperience.nota;
import org.json.JSONObject;
/** Editing the text of an existing ongoing notice must not repost it as a new alert. */
final class NotificationPolicy {
 static boolean updateInPlace(JSONObject previous,JSONObject next,long now){return previous!=null&&previous.optBoolean("fired")&&next.optBoolean("ongoing")&&previous.optLong("rev")==next.optLong("rev")&&previous.optLong("when")==next.optLong("when")&&next.optLong("when")<=now;}
}
