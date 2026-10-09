package com.alsatport.app;

import android.net.Uri;

/**
 * Opens alsatport.com in a Trusted Web Activity. The browser keeps cookies, Google sign-in, 2FA, file pickers
 * and the back stack; this activity only chooses the start URL.
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        Uri incoming = super.getLaunchingUrl();
        return Uri.parse(UrlPolicy.launchUrl(incoming == null ? null : incoming.toString()));
    }
}
