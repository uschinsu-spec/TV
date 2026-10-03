package com.uschinsu.tvutility;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.Locale;

public class MainActivity extends Activity {

    private static final String HOME_URL = "https://uschinsu-spec.github.io/TV/";
    private static final float STICK_DEADZONE = 0.16f;
    private static final long AXIS_DISPATCH_INTERVAL_MS = 20L;

    private FrameLayout root;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private long lastAxisDispatchAt = 0L;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );
        enterImmersiveMode();

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF000000);
        setContentView(root);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF000000);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVisibility(View.INVISIBLE);

        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        CookieManager.setAcceptFileSchemeCookies(false);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                enterImmersiveMode();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.setVisibility(View.VISIBLE);
                view.requestFocus(View.FOCUS_DOWN);
                view.evaluateJavascript(
                        "(function(){try{" +
                        "window.__TV_NATIVE_GAMEPAD__=true;" +
                        "window.__TV_NATIVE_APP_VERSION__='1.6';" +
                        "document.documentElement.classList.add('android-tv');" +
                        "var f=document.querySelector('.app-card.focusable,.focusable');if(f)f.focus();" +
                        "}catch(e){}})();",
                        null
                );
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                WebView.HitTestResult result = view.getHitTestResult();
                String url = result != null ? result.getExtra() : null;
                if (url != null) {
                    view.loadUrl(url);
                    return false;
                }
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(view);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                root.addView(customView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));
                enterImmersiveMode();
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }
        });

        webView.loadUrl(buildFreshHomeUrl());
        webView.requestFocus(View.FOCUS_DOWN);
    }

    private String buildFreshHomeUrl() {
        // One network navigation only. Web assets are versioned and the Service Worker is network-first.
        return HOME_URL + "?_tvapp=1.6";
    }

    private boolean isHomeOrigin(String url) {
        return url != null && url.startsWith("https://uschinsu-spec.github.io/TV/");
    }

    private boolean isHomeVisible() {
        return webView != null && isHomeOrigin(webView.getUrl());
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private void hideCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }
        webView.requestFocus(View.FOCUS_DOWN);
        enterImmersiveMode();
    }

    private boolean isGameControllerSource(int source) {
        return ((source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD) ||
                ((source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK);
    }

    private boolean isHomeNavigationKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_SPACE:
            case KeyEvent.KEYCODE_BACK:
                return true;
            default:
                return false;
        }
    }

    private String controllerButtonName(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return "A";
            case KeyEvent.KEYCODE_BUTTON_B: return "B";
            case KeyEvent.KEYCODE_BUTTON_X: return "X";
            case KeyEvent.KEYCODE_BUTTON_Y: return "Y";
            case KeyEvent.KEYCODE_BUTTON_L1: return "L1";
            case KeyEvent.KEYCODE_BUTTON_R1: return "R1";
            case KeyEvent.KEYCODE_BUTTON_L2: return "L2";
            case KeyEvent.KEYCODE_BUTTON_R2: return "R2";
            case KeyEvent.KEYCODE_BUTTON_START: return "START";
            case KeyEvent.KEYCODE_BUTTON_SELECT: return "SELECT";
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return "L3";
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return "R3";
            case KeyEvent.KEYCODE_BUTTON_MODE: return "MODE";
            case KeyEvent.KEYCODE_BUTTON_C: return "C";
            case KeyEvent.KEYCODE_BUTTON_Z: return "Z";
            case KeyEvent.KEYCODE_DPAD_UP: return "DPAD_UP";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "DPAD_DOWN";
            case KeyEvent.KEYCODE_DPAD_LEFT: return "DPAD_LEFT";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "DPAD_RIGHT";
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_SPACE:
                return "DPAD_CENTER";
            default:
                if (keyCode >= KeyEvent.KEYCODE_BUTTON_1 && keyCode <= KeyEvent.KEYCODE_BUTTON_16) {
                    return "BUTTON_" + (keyCode - KeyEvent.KEYCODE_BUTTON_1 + 1);
                }
                return KeyEvent.keyCodeToString(keyCode);
        }
    }

    private String jsString(String value) {
        if (value == null) return "";
        return value
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", " ")
                .replace("\r", " ");
    }

    private String controllerDeviceName(InputDevice device) {
        if (device == null) return "Android input";
        return device.getName() + " [VID " + device.getVendorId() + " PID " + device.getProductId() + "]";
    }

    private String fallbackDomKey(String name) {
        switch (name) {
            case "DPAD_UP": return "ArrowUp";
            case "DPAD_DOWN": return "ArrowDown";
            case "DPAD_LEFT": return "ArrowLeft";
            case "DPAD_RIGHT": return "ArrowRight";
            case "A":
            case "DPAD_CENTER":
            case "START": return "Enter";
            case "B": return "Escape";
            case "X": return "x";
            case "Y": return "y";
            case "L1": return "PageUp";
            case "R1": return "PageDown";
            case "L2": return "q";
            case "R2": return "e";
            case "SELECT": return "Tab";
            case "L3": return "1";
            case "R3": return "2";
            default: return "";
        }
    }

    private String fallbackDomCode(String name) {
        switch (name) {
            case "DPAD_UP": return "ArrowUp";
            case "DPAD_DOWN": return "ArrowDown";
            case "DPAD_LEFT": return "ArrowLeft";
            case "DPAD_RIGHT": return "ArrowRight";
            case "A":
            case "DPAD_CENTER":
            case "START": return "Enter";
            case "B": return "Escape";
            case "X": return "KeyX";
            case "Y": return "KeyY";
            case "L1": return "PageUp";
            case "R1": return "PageDown";
            case "L2": return "KeyQ";
            case "R2": return "KeyE";
            case "SELECT": return "Tab";
            case "L3": return "Digit1";
            case "R3": return "Digit2";
            default: return "";
        }
    }

    private void emitInputButton(KeyEvent event, boolean forceRemote) {
        if (webView == null) return;
        String action = event.getAction() == KeyEvent.ACTION_DOWN ? "down" : "up";
        String name = forceRemote && event.getKeyCode() == KeyEvent.KEYCODE_BACK
                ? "B"
                : controllerButtonName(event.getKeyCode());
        String device = controllerDeviceName(event.getDevice());
        String source = forceRemote ? "remote" : "gamepad";
        String domKey = fallbackDomKey(name);
        String domCode = fallbackDomCode(name);
        boolean down = event.getAction() == KeyEvent.ACTION_DOWN;

        String js = "(function(){try{" +
                "window.__TV_NATIVE_GAMEPAD__=true;" +
                "window.__lastTVGamepadDevice='" + jsString(device) + "';" +
                "var d={kind:'button',action:'" + action + "',name:'" + jsString(name) + "',code:" + event.getKeyCode() +
                ",repeat:" + event.getRepeatCount() + ",source:'" + source + "',device:'" + jsString(device) + "'};" +
                "if(window.__TV_INPUT_BRIDGE_READY__){" +
                " window.dispatchEvent(new CustomEvent('tvgamepad',{detail:d}));" +
                "}else{" +
                " var k='" + jsString(domKey) + "',c='" + jsString(domCode) + "';" +
                " if(k){var t=document.activeElement||document;" +
                " t.dispatchEvent(new KeyboardEvent('" + (down ? "keydown" : "keyup") + "',{key:k,code:c,bubbles:true,cancelable:true,repeat:" + (event.getRepeatCount() > 0 ? "true" : "false") + "}));}" +
                "}" +
                "}catch(e){}})();";
        webView.evaluateJavascript(js, null);
    }

    private float centeredAxis(MotionEvent event, int axis) {
        InputDevice device = event.getDevice();
        if (device == null) return 0f;
        InputDevice.MotionRange range = device.getMotionRange(axis);
        if (range == null) return 0f;
        float value = event.getAxisValue(axis);
        float flat = Math.max(STICK_DEADZONE, range.getFlat());
        return Math.abs(value) <= flat ? 0f : clamp(value, -1f, 1f);
    }

    private float triggerAxis(MotionEvent event, int axis) {
        InputDevice device = event.getDevice();
        if (device == null) return 0f;
        InputDevice.MotionRange range = device.getMotionRange(axis);
        if (range == null) return 0f;
        float raw = event.getAxisValue(axis);
        float min = range.getMin();
        float max = range.getMax();
        float value;
        if (max > min) value = (raw - min) / (max - min);
        else value = raw;
        return clamp(value, 0f, 1f);
    }

    private float dominant(float a, float b) {
        return Math.abs(a) >= Math.abs(b) ? a : b;
    }

    private float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private String number(float value) {
        return String.format(Locale.US, "%.4f", value);
    }

    private void emitGamepadAxes(MotionEvent event) {
        if (webView == null) return;
        long now = SystemClock.uptimeMillis();
        if (now - lastAxisDispatchAt < AXIS_DISPATCH_INTERVAL_MS) return;
        lastAxisDispatchAt = now;

        float lx = centeredAxis(event, MotionEvent.AXIS_X);
        float ly = centeredAxis(event, MotionEvent.AXIS_Y);

        float rx = dominant(
                centeredAxis(event, MotionEvent.AXIS_Z),
                centeredAxis(event, MotionEvent.AXIS_RX)
        );
        float ry = dominant(
                centeredAxis(event, MotionEvent.AXIS_RZ),
                centeredAxis(event, MotionEvent.AXIS_RY)
        );

        float hatX = centeredAxis(event, MotionEvent.AXIS_HAT_X);
        float hatY = centeredAxis(event, MotionEvent.AXIS_HAT_Y);

        float lt = Math.max(
                triggerAxis(event, MotionEvent.AXIS_LTRIGGER),
                triggerAxis(event, MotionEvent.AXIS_BRAKE)
        );
        float rt = Math.max(
                triggerAxis(event, MotionEvent.AXIS_RTRIGGER),
                triggerAxis(event, MotionEvent.AXIS_GAS)
        );

        String device = controllerDeviceName(event.getDevice());
        String js = "(function(){try{" +
                "window.__TV_NATIVE_GAMEPAD__=true;" +
                "window.__lastTVGamepadDevice='" + jsString(device) + "';" +
                "var d={kind:'axes',lx:" + number(lx) + ",ly:" + number(ly) + ",rx:" + number(rx) + ",ry:" + number(ry) +
                ",hatX:" + number(hatX) + ",hatY:" + number(hatY) + ",lt:" + number(lt) + ",rt:" + number(rt) +
                ",source:'gamepad',device:'" + jsString(device) + "'};" +
                "if(window.__TV_INPUT_BRIDGE_READY__){" +
                " window.dispatchEvent(new CustomEvent('tvgamepad',{detail:d}));" +
                "}else{" +
                " var x=Math.abs(d.hatX)>Math.abs(d.lx)?d.hatX:d.lx;" +
                " var y=Math.abs(d.hatY)>Math.abs(d.ly)?d.hatY:d.ly;" +
                " window.__tvAxisFallback=window.__tvAxisFallback||{};var s=window.__tvAxisFallback,n=Date.now();" +
                " function p(name,key,on){if(on&&(!s[name]||n-s[name]>145)){s[name]=n;var t=document.activeElement||document;" +
                " t.dispatchEvent(new KeyboardEvent('keydown',{key:key,code:key,bubbles:true,cancelable:true}));" +
                " t.dispatchEvent(new KeyboardEvent('keyup',{key:key,code:key,bubbles:true,cancelable:true}));}if(!on)s[name]=0;}" +
                " p('l','ArrowLeft',x<-.52);p('r','ArrowRight',x>.52);p('u','ArrowUp',y<-.52);p('d','ArrowDown',y>.52);" +
                "}" +
                "}catch(e){}})();";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        // Fullscreen media keeps Android Back for closing the fullscreen surface.
        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                keyCode == KeyEvent.KEYCODE_BACK &&
                customView != null) {
            hideCustomView();
            return true;
        }

        // Keep the F710/native gamepad path that already works.
        if (isGameControllerSource(event.getSource())) {
            emitInputButton(event, false);
            if (isHomeVisible()) {
                return true;
            }
        }

        // Xiaomi/Android TV remotes are normally SOURCE_DPAD/keyboard.
        // Forward D-pad, OK/Enter and Back to the same JS input bridge.
        if (isHomeVisible() && isHomeNavigationKey(keyCode)) {
            emitInputButton(event, true);
            return true;
        }

        // Normal Android history behavior only outside the TV Home origin.
        if (event.getAction() == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_MOVE && isGameControllerSource(event.getSource())) {
            emitGamepadAxes(event);
            if (isHomeVisible()) {
                return true;
            }
        }
        return super.dispatchGenericMotionEvent(event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) {
            webView.onResume();
            webView.requestFocus(View.FOCUS_DOWN);
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (webView != null && level >= TRIM_MEMORY_RUNNING_LOW) {
            webView.clearCache(false);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
