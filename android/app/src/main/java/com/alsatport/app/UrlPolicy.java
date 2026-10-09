package com.alsatport.app;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;

/** Decides which URLs the app may open in its Trusted Web Activity. */
final class UrlPolicy {
    static final String HOST = "alsatport.com";
    static final String START_URL = "https://alsatport.com/";

    private UrlPolicy() {}

    /** Only https://alsatport.com on the default port, without credentials. */
    static boolean isOwnUrl(String url) {
        if (url == null || url.isEmpty()) return false;
        final URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException e) {
            return false;
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return scheme != null
                && "https".equals(scheme.toLowerCase(Locale.ROOT))
                && host != null
                && HOST.equals(host.toLowerCase(Locale.ROOT))
                && uri.getPort() == -1
                && uri.getRawUserInfo() == null;
    }

    /** The URL to launch: the incoming link when it belongs to AlsatPort, otherwise the home page. */
    static String launchUrl(String incoming) {
        return isOwnUrl(incoming) ? incoming : START_URL;
    }
}
