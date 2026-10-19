package com.nthexperience.nota;
/** Legacy default-on settings are not evidence of an affirmative consent choice. */
final class CloudConsent {
 static boolean allowed(boolean configured,int version,boolean accepted){return configured&&version>=1&&accepted;}
}
