package com.nthexperience.nota;
import org.junit.*;
import org.junit.rules.TemporaryFolder;
import java.io.*;
import java.nio.file.Files;
import java.util.Base64;
import static org.junit.Assert.*;
public class AudioTransferTest {
 @Rule public TemporaryFolder folder=new TemporaryFolder();
 @Test public void trustedOriginIsExactAndAudioCannotBeGrantedToImportedContent(){assertTrue(WebMediaPermissions.trustedOrigin("https://appassets.androidplatform.net/"));assertTrue(WebMediaPermissions.trustedOrigin("https://appassets.androidplatform.net:443"));for(String origin:new String[]{"http://appassets.androidplatform.net","https://appassets.androidplatform.net.evil.example","https://other.example","https://user@appassets.androidplatform.net","https://appassets.androidplatform.net:444","https://appassets.androidplatform.net/page","null"})assertFalse(origin,WebMediaPermissions.trustedOrigin(origin));}
 @Test public void pcmTransferIsExactAndDoesNotAcceptConcurrentOrOversizedUploads()throws Exception{PcmTransfer t=new PcmTransfer(folder.getRoot());assertFalse(t.begin("bad",PcmTransfer.MAX_BYTES+2));assertFalse(t.begin("odd",3));assertTrue(t.begin("first",4));assertFalse(t.begin("second",4));assertFalse(t.append("second","AAAAAA=="));assertTrue(t.append("first",Base64.getEncoder().encodeToString(new byte[]{1,2})));assertNull(t.take("first"));assertTrue(t.append("first",Base64.getEncoder().encodeToString(new byte[]{3,4})));File f=t.take("first");assertNotNull(f);assertArrayEquals(new byte[]{1,2,3,4},Files.readAllBytes(f.toPath()));f.delete();assertTrue(t.begin("next",2));t.cancel("next");assertEquals(0,folder.getRoot().list().length);}
 @Test public void invalidOrOverflowingChunksAreRemovedAndCancelledUploadsCanRetry(){PcmTransfer t=new PcmTransfer(folder.getRoot());assertTrue(t.begin("one",2));assertFalse(t.append("one","not base64!"));assertEquals(0,folder.getRoot().list().length);assertTrue(t.begin("two",2));assertFalse(t.append("two",Base64.getEncoder().encodeToString(new byte[4])));assertEquals(0,folder.getRoot().list().length);assertTrue(t.begin("three",2));t.cancel("wrong");assertFalse(t.begin("four",2));t.cancel("three");assertTrue(t.begin("four",2));t.clear();}
}
