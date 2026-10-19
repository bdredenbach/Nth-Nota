package com.nthexperience.nota;
import java.io.*;
import java.util.Base64;

/** One bounded app-cache transfer; callers never supply paths. */
final class ImageTransfer {
    static final long MAX_BYTES=6L*1024*1024;private final File directory;private String id;private File file;private OutputStream output;private long expected,written;
    ImageTransfer(File directory){this.directory=directory;}
    synchronized boolean begin(String token,long size){if(id!=null||token==null||!token.matches("[-A-Za-z0-9_]{1,100}")||size<=0||size>MAX_BYTES)return false;try{file=File.createTempFile("nota-photo-",".jpg",directory);output=new FileOutputStream(file);id=token;expected=size;written=0;return true;}catch(IOException e){clear();return false;}}
    synchronized boolean append(String token,String encoded){if(id==null||!id.equals(token)||encoded==null||encoded.length()>80000)return false;try{byte[] bytes=Base64.getDecoder().decode(encoded);if(written+bytes.length>expected)return false;output.write(bytes);written+=bytes.length;return true;}catch(Exception e){return false;}}
    synchronized File take(String token){if(id==null||!id.equals(token)||written!=expected)return null;try{output.close();output=null;File result=file;file=null;id=null;return result;}catch(IOException e){clear();return null;}}
    synchronized void cancel(String token){if(id!=null&&id.equals(token))clear();}
    synchronized void clear(){try{if(output!=null)output.close();}catch(IOException ignored){}if(file!=null)file.delete();id=null;file=null;output=null;expected=written=0;}
}
