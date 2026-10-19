package com.nthexperience.nota;

import org.json.*;
import java.util.*;

/** Bounds checked before handing local stroke data to ML Kit. */
final class InkInput {
    static final int MAX_POINTS=12000,MAX_STROKES=512;
    static final class Point { final float x,y;final long t;Point(double x,double y,double t){this.x=(float)x;this.y=(float)y;this.t=(long)t;} }
    final List<List<Point>> strokes=new ArrayList<>();final String language;
    InkInput(String json) throws JSONException {
        if(json==null||json.length()>1200000)throw new IllegalArgumentException("Use a shorter line of handwriting.");
        JSONObject input=new JSONObject(json);language=input.optString("language","");
        if(!language.matches("[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}"))throw new IllegalArgumentException("Choose a writing language.");
        if(input.getInt("width")!=1000||input.getInt("height")!=440)throw new IllegalArgumentException("Invalid writing area.");
        JSONArray batches=input.getJSONArray("strokes");if(batches.length()==0||batches.length()>MAX_STROKES)throw new IllegalArgumentException("Write a short word or line first.");
        int total=0;for(int s=0;s<batches.length();s++){JSONArray points=batches.getJSONArray(s);total+=points.length();if(points.length()==0||total>MAX_POINTS)throw new IllegalArgumentException("Convert this line before writing more.");List<Point> stroke=new ArrayList<>();double previous=-1;for(int p=0;p<points.length();p++){JSONArray point=points.getJSONArray(p);if(point.length()!=3)throw new IllegalArgumentException("Invalid handwriting points.");double x=point.getDouble(0),y=point.getDouble(1),t=point.getDouble(2);if(!Double.isFinite(x)||!Double.isFinite(y)||!Double.isFinite(t)||x<0||x>1000||y<0||y>440||t<0||t<previous||t>1e15)throw new IllegalArgumentException("Invalid handwriting points.");stroke.add(new Point(x,y,t));previous=t;}strokes.add(stroke);}
    }
}
