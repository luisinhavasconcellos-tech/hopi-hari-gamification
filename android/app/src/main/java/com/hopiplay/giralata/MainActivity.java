package com.hopiplay.giralata;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Giralata — Tampinhas em Órbita.
 *
 * Um WebView em tela cheia (paisagem) que serve o bundle web empacotado em
 * assets/www a partir da origem interna https://giralata.hopiplay.app/.
 * Servir por https (e não file://) mantém módulos ES, localStorage e WebGL
 * a funcionar como no navegador, sem abrir acesso ao sistema de ficheiros.
 * Sem androidx, sem rede: tudo é local ao aparelho.
 */
public class MainActivity extends Activity {

    private static final String HOST = "giralata.hopiplay.app";
    private static final String ORIGIN = "https://" + HOST + "/";
    private static final String ASSET_ROOT = "www/";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF22B8E8); // céu ciano enquanto carrega
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.addJavascriptInterface(new Bridge(), "HopiPlayAndroid");
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new WebChromeClient());
        setContentView(web);

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(ORIGIN + "index.html");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        web.onResume();
        web.resumeTimers();
    }

    @Override
    protected void onPause() {
        // a página pausa sozinha ao perder visibilidade (visibilitychange)
        web.onPause();
        web.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    /** Botão "voltar": o jogo decide (pausa, fecha modal, volta à intro ou sai). */
    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript(
                "(function(){return !!(window.giralataBack && window.giralataBack());})()",
                handled -> {
                    if (!"true".equals(handled)) finish();
                });
    }

    @SuppressWarnings("deprecation")
    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    /** Ponte mínima exposta à página como window.HopiPlayAndroid. */
    private final class Bridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(MainActivity.this::finish);
        }

        @JavascriptInterface
        public String platform() {
            return "android";
        }
    }

    /** Serve assets/www na origem interna e bloqueia qualquer outra navegação. */
    private final class AssetClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String host = request.getUrl().getHost();
            return host == null || !HOST.equals(host); // true = bloqueia
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!HOST.equals(request.getUrl().getHost())) {
                return deny();
            }
            String path = request.getUrl().getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
            if (path.contains("..")) return deny();
            String assetPath = ASSET_ROOT + path.substring(1);
            try {
                InputStream in = getAssets().open(assetPath);
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", ORIGIN);
                headers.put("Cache-Control", "no-cache");
                return new WebResourceResponse(mimeFor(assetPath), charsetFor(assetPath), 200, "OK", headers, in);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                        new HashMap<>(), new ByteArrayInputStream(new byte[0]));
            }
        }

        private WebResourceResponse deny() {
            return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden",
                    new HashMap<>(), new ByteArrayInputStream(new byte[0]));
        }

        private String mimeFor(String path) {
            String p = path.toLowerCase(Locale.ROOT);
            if (p.endsWith(".html")) return "text/html";
            if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
            if (p.endsWith(".css")) return "text/css";
            if (p.endsWith(".json")) return "application/json";
            if (p.endsWith(".svg")) return "image/svg+xml";
            if (p.endsWith(".png")) return "image/png";
            if (p.endsWith(".webp")) return "image/webp";
            if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
            if (p.endsWith(".ico")) return "image/x-icon";
            if (p.endsWith(".woff2")) return "font/woff2";
            if (p.endsWith(".woff")) return "font/woff";
            if (p.endsWith(".wasm")) return "application/wasm";
            if (p.endsWith(".txt")) return "text/plain";
            return "application/octet-stream";
        }

        private String charsetFor(String path) {
            String p = path.toLowerCase(Locale.ROOT);
            boolean text = p.endsWith(".html") || p.endsWith(".js") || p.endsWith(".mjs") || p.endsWith(".css")
                    || p.endsWith(".json") || p.endsWith(".svg") || p.endsWith(".txt");
            return text ? "utf-8" : null;
        }
    }
}
