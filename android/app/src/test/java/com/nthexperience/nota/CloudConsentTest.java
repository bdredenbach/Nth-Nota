package com.nthexperience.nota;
import org.junit.Test;
import static org.junit.Assert.*;
public class CloudConsentTest {
 @Test public void legacyDefaultOnIsNotConsent(){assertFalse(CloudConsent.allowed(true,0,true));assertFalse(CloudConsent.allowed(true,0,false));}
 @Test public void onlyExplicitAcceptedCurrentChoiceEnablesCloud(){assertTrue(CloudConsent.allowed(true,1,true));assertFalse(CloudConsent.allowed(true,1,false));assertFalse(CloudConsent.allowed(false,1,true));}
}
