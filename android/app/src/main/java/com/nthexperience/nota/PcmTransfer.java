package com.nthexperience.nota;
import java.io.*;
import java.util.Base64;
/** Bounded, exact-length local PCM upload; never accepts caller-supplied paths. */
final class PcmTransfer {
 static final long MAX_BYTES=120L*16000*2;
 private final File directory;private String id;private File file;private OutputStream output;private long expected,written;
 PcmTransfer(File directory){this.directory=directory;}
 synchronized boolean begin(String token,long size){if(id!=null||token==null||!token.matches("[A-Za-z0-9_-]{1,100}")||size<=0||size>MAX_BYTES||size%2!=0)return false;try{file=File.createTempFile("nota-speech-",".pcm",directory);output=new FileOutputStream(file);id=token;expected=size;written=0;return true;}catch(IOException e){clear();return false;}}
 synchronized boolean append(String token,String data){if(id==null||!id.equals(token)||output==null||data==null||data.length()>128000)return false;try{byte[] bytes=Base64.getDecoder().decode(data);if(written+bytes.length>expected){clear();return false;}output.write(bytes);written+=bytes.length;return true;}catch(Exception e){clear();return false;}}
 synchronized File take(String token){if(id==null||!id.equals(token)||written!=expected)return null;try{output.close();File ready=file;id=null;file=null;output=null;return ready;}catch(IOException e){clear();return null;}}
 synchronized void cancel(String token){if(id!=null&&id.equals(token))clear();}
 synchronized void clear(){try{if(output!=null)output.close();}catch(IOException ignored){}if(file!=null)file.delete();id=null;file=null;output=null;}
}
