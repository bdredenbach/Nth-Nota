package com.nthexperience.nota;
import java.net.URI;
/** Microphone grants are restricted to the bundled app origin. */
final class WebMediaPermissions {
 static boolean trustedOrigin(String value){try{URI u=new URI(value);return "https".equalsIgnoreCase(u.getScheme())&&"appassets.androidplatform.net".equalsIgnoreCase(u.getHost())&&(u.getPort()==-1||u.getPort()==443)&&u.getUserInfo()==null&&u.getQuery()==null&&u.getFragment()==null&&(u.getPath()==null||u.getPath().isEmpty()||u.getPath().equals("/"));}catch(Exception e){return false;}}
}
