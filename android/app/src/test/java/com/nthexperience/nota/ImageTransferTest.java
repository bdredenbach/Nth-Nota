package com.nthexperience.nota;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.Files;
import java.util.Base64;
public class ImageTransferTest {
 @Test public void completesOnlyExactLengthAndKeepsBytes()throws Exception{File directory=Files.createTempDirectory("photo-test").toFile();ImageTransfer t=new ImageTransfer(directory);assertTrue(t.begin("one",4));assertTrue(t.append("one",Base64.getEncoder().encodeToString(new byte[]{1,2})));assertNull(t.take("one"));assertFalse(t.append("other","AQI="));assertTrue(t.append("one",Base64.getEncoder().encodeToString(new byte[]{3,4})));File image=t.take("one");assertArrayEquals(new byte[]{1,2,3,4},Files.readAllBytes(image.toPath()));image.delete();directory.delete();}
 @Test public void boundsSizesRejectsInvalidEncodingAndClearsCancellation()throws Exception{File directory=Files.createTempDirectory("photo-test").toFile();ImageTransfer t=new ImageTransfer(directory);assertFalse(t.begin("bad",0));assertFalse(t.begin("bad",ImageTransfer.MAX_BYTES+1));assertFalse(t.begin("../bad",1));assertTrue(t.begin("one",1));assertFalse(t.append("one","!!!!"));assertFalse(t.append("one","AQI="));assertFalse(t.begin("two",1));t.cancel("wrong");assertFalse(t.begin("two",1));t.cancel("one");assertEquals(0,directory.list().length);assertTrue(t.begin("two",1));t.clear();directory.delete();}
}
