package com.alsatport.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UrlPolicyTest {

    @Test
    public void acceptsOwnHttpsLinks() {
        assertTrue(UrlPolicy.isOwnUrl("https://alsatport.com/"));
        assertTrue(UrlPolicy.isOwnUrl("https://alsatport.com/ilan/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"));
        assertTrue(UrlPolicy.isOwnUrl("https://ALSATPORT.com/ara?q=bisiklet#sonuclar"));
        assertTrue(UrlPolicy.isOwnUrl("https://alsatport.com/eposta-dogrula?token=abc"));
    }

    @Test
    public void rejectsOtherSchemesHostsAndTricks() {
        String[] bad = {
            null,
            "",
            "http://alsatport.com/",
            "javascript:alert(1)",
            "intent://alsatport.com/#Intent;end",
            "file:///sdcard/x.html",
            "https://evil.example/",
            "https://alsatport.com.evil.example/",
            "https://evilalsatport.com/",
            "https://www.alsatport.com/",
            "https://alsatport.com:8443/",
            "https://user@alsatport.com/",
            "https://evil.example#@alsatport.com/",
            "https://alsatport.com\\@evil.example/",
            "https://evil.example/https://alsatport.com/",
        };
        for (String url : bad) {
            assertFalse(String.valueOf(url), UrlPolicy.isOwnUrl(url));
        }
    }

    @Test
    public void fallsBackToHomePage() {
        assertEquals(UrlPolicy.START_URL, UrlPolicy.launchUrl("https://evil.example/"));
        assertEquals(UrlPolicy.START_URL, UrlPolicy.launchUrl(null));
        assertEquals("https://alsatport.com/ara", UrlPolicy.launchUrl("https://alsatport.com/ara"));
    }
}
