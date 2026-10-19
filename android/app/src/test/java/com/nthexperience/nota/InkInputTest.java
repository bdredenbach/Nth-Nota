package com.nthexperience.nota;
import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;
public class InkInputTest {
    private String data(JSONArray strokes)throws Exception{return new JSONObject().put("language","en-US").put("width",1000).put("height",440).put("strokes",strokes).toString();}
    @Test public void acceptsFingerStrokeWithTimeAndLanguage()throws Exception{InkInput input=new InkInput(data(new JSONArray("[[[10,20,1],[800,400,21]]]")));assertEquals("en-US",input.language);assertEquals(2,input.strokes.get(0).size());assertEquals(800f,input.strokes.get(0).get(1).x,0);}
    @Test public void rejectsOutOfBoundsAndBackwardsTime()throws Exception{for(String s:new String[]{"[[[1001,2,1]]]","[[[1,2,-2]]]","[[[1,2,2],[2,3,1]]]","[]","[[]]"}){try{new InkInput(data(new JSONArray(s)));fail(s);}catch(IllegalArgumentException expected){}}}
    @Test public void boundsStrokeCountAndTotalPoints()throws Exception{JSONArray batches=new JSONArray();for(int i=0;i<513;i++)batches.put(new JSONArray("[[1,2,1]]"));try{new InkInput(data(batches));fail();}catch(IllegalArgumentException expected){}JSONArray points=new JSONArray();for(int i=0;i<12001;i++)points.put(new JSONArray("[1,2,1]"));try{new InkInput(data(new JSONArray().put(points)));fail();}catch(IllegalArgumentException expected){}}
}
