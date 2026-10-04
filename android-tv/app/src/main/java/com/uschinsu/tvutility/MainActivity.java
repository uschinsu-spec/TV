package com.uschinsu.tvutility;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Display;
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
    private static final float GAME_STICK_DEADZONE = 0.035f;
    private static final float AXIS_CHANGE_EPSILON = 0.025f;
    private static final long AXIS_DISPATCH_INTERVAL_MS = 20L;

    private FrameLayout root;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private long lastAxisDispatchAt = 0L;
    private int lastAxisDeviceId = -1;
    private int lastFastAxisDeviceId = -1;
    private int lastFastButtonDeviceId = -1;
    private boolean hasLastAxes = false;
    private boolean nativeTvFullscreen = false;
    private boolean homeVisible = false;
    private GamepadStateBridge gamepadStateBridge;
    private float lastLx, lastLy, lastRx, lastRy, lastHatX, lastHatY, lastLt, lastRt;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );
        prefer60HzDisplayMode();
        enterImmersiveMode();

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF000000);
        setContentView(root);

        WebView.setWebContentsDebuggingEnabled(false);
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF000000);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVisibility(View.INVISIBLE);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }

        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        gamepadStateBridge = new GamepadStateBridge();
        webView.addJavascriptInterface(gamepadStateBridge, "TVNativeInput");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        CookieManager.setAcceptFileSchemeCookies(false);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            private boolean handleNativeCommand(String url) {
                if (url == null) return false;
                if (url.startsWith("tvnative://exit")) {
                    runOnUiThread(() -> {
                        try {
                            if (android.os.Build.VERSION.SDK_INT >= 21) finishAndRemoveTask();
                            else finish();
                        } catch (Exception ignored) {
                            finish();
                        }
                    });
                    return true;
                }
                if (url.startsWith("tvnative://tvfullscreen")) {
                    runOnUiThread(() -> {
                        if (nativeTvFullscreen) exitNativeTvFullscreen();
                        else enterNativeTvFullscreen();
                    });
                    return true;
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request != null && request.getUrl() != null ? request.getUrl().toString() : null;
                return handleNativeCommand(url);
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNativeCommand(url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                nativeTvFullscreen = false;
                homeVisible = isHomeOrigin(url);
                if (gamepadStateBridge != null) gamepadStateBridge.setLowLatencyMode(false);
                enterImmersiveMode();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                homeVisible = isHomeOrigin(url);
                view.setVisibility(View.VISIBLE);
                view.requestFocus(View.FOCUS_DOWN);
                view.evaluateJavascript(
                        "(function(){try{" +
                        "window.__TV_NATIVE_GAMEPAD__=true;" +
                        "window.__TV_NATIVE_APP_VERSION__='2.3';window.__TV_NATIVE_LOW_LATENCY__=true;window.__TV_NATIVE_ULTRA_60HZ__=true;window.__TV_NATIVE_LOCK_FREE_INPUT__=true;" +
                        "document.documentElement.setAttribute('tabindex','-1');" +
                        "document.documentElement.focus();" +

                        // Add native Exit button to the existing bottom quick-actions row.
                        "function installExit(){" +
                        " var host=document.querySelector('.quick-buttons');" +
                        " if(!host||document.getElementById('nativeExitAppBtn'))return;" +
                        " var b=document.createElement('button');" +
                        " b.id='nativeExitAppBtn';b.className='sys-btn focusable';" +
                        " b.innerHTML='⏻ <span>Thoát APP</span>';" +
                        " b.addEventListener('click',function(){location.href='tvnative://exit';});" +
                        " host.appendChild(b);" +
                        "}" +

                        // Add a TV-video fullscreen button whenever #tvVideo is created by the web app.
                        "function installTvFullscreen(){" +
                        " var v=document.getElementById('tvVideo');" +
                        " if(!v||document.getElementById('nativeTvFullscreenBtn'))return;" +
                        " var row=document.querySelector('.tv-now-row');if(!row)return;" +
                        " var b=document.createElement('button');" +
                        " b.id='nativeTvFullscreenBtn';b.className='btn compact focusable';" +
                        " b.textContent='⛶ Toàn màn hình TV';" +
                        " b.addEventListener('click',function(){location.href='tvnative://tvfullscreen';});" +
                        " var adv=document.getElementById('tvAdvancedToggle');" +
                        " if(adv&&adv.parentNode===row)row.insertBefore(b,adv);else row.appendChild(b);" +
                        "}" +

                        // B/Back twice at the root exits. Inside panels/games Back keeps its normal web behavior.
                        "if(!window.__tvNativeBackInstalled){" +
                        " window.__tvNativeBackInstalled=true;window.__tvNativeBackAt=0;" +
                        " window.addEventListener('tvgamepad',function(ev){" +
                        "  try{" +
                        "   var d=ev&&ev.detail||{};" +
                        "   if(d.kind!=='button'||d.action!=='down'||d.name!=='B')return;" +
                        "   var panel=document.getElementById('appPanel');" +
                        "   if((panel&&panel.classList.contains('open'))||window.tvGameActive||document.fullscreenElement)return;" +
                        "   var n=Date.now();" +
                        "   if(n-(window.__tvNativeBackAt||0)<1900){" +
                        "    window.__tvNativeBackAt=0;ev.stopImmediatePropagation();location.href='tvnative://exit';" +
                        "   }else{" +
                        "    window.__tvNativeBackAt=n;ev.stopImmediatePropagation();" +
                        "    if(window.showToast)window.showToast('Nhấn Back lần nữa để thoát APP');" +
                        "   }" +
                        "  }catch(e){}" +
                        " },true);" +
                        "}" +

                        "installExit();installTvFullscreen();" +
                        "if(!window.__tvNativeControlsObserver){" +
                        " window.__tvNativeControlsObserver=new MutationObserver(function(){installExit();installTvFullscreen();});" +
                        " window.__tvNativeControlsObserver.observe(document.documentElement,{childList:true,subtree:true});" +
                        "}" +
                        "}catch(e){}})();",
                        null
                );
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
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
        // Keep APK independent from web releases: V7, V8, V9... all use the same root URL.
        return HOME_URL;
    }

    private boolean isHomeOrigin(String url) {
        return url != null && url.startsWith("https://uschinsu-spec.github.io/TV/");
    }

    private boolean isHomeVisible() {
        return webView != null && homeVisible;
    }

    private void prefer60HzDisplayMode() {
        if (android.os.Build.VERSION.SDK_INT < 23) return;
        try {
            Display display = getWindowManager().getDefaultDisplay();
            Display.Mode current = display.getMode();
            Display.Mode best = current;
            float bestDelta = Math.abs(current.getRefreshRate() - 60f);

            for (Display.Mode mode : display.getSupportedModes()) {
                if (mode.getPhysicalWidth() != current.getPhysicalWidth() ||
                        mode.getPhysicalHeight() != current.getPhysicalHeight()) {
                    continue;
                }
                float delta = Math.abs(mode.getRefreshRate() - 60f);
                if (delta < bestDelta) {
                    best = mode;
                    bestDelta = delta;
                }
            }

            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.preferredDisplayModeId = best.getModeId();
            params.preferredRefreshRate = 60f;
            getWindow().setAttributes(params);
        } catch (Exception ignored) {
            // Keep the TV's current display mode when a vendor firmware rejects mode selection.
        }
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

    private void enterNativeTvFullscreen() {
        if (webView == null || nativeTvFullscreen) return;
        nativeTvFullscreen = true;
        enterImmersiveMode();
        webView.evaluateJavascript(
                "(function(){try{" +
                "var v=document.getElementById('tvVideo');if(!v)return;" +
                "var s=document.getElementById('__tvNativeFullscreenStyle');" +
                "if(!s){s=document.createElement('style');s.id='__tvNativeFullscreenStyle';" +
                "s.textContent='body.__tv-native-tvfs{overflow:hidden!important;background:#000!important}' +" +
                "'body.__tv-native-tvfs #tvVideo{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;" +
                "width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;" +
                "margin:0!important;padding:0!important;border:0!important;border-radius:0!important;" +
                "z-index:2147483647!important;background:#000!important;object-fit:contain!important;}' ;" +
                "document.head.appendChild(s);}" +
                "document.body.classList.add('__tv-native-tvfs');" +
                "window.__tvNativeVideoFullscreen=true;" +
                "var b=document.getElementById('nativeTvFullscreenBtn');if(b)b.textContent='↩ Thoát toàn màn hình';" +
                "v.setAttribute('tabindex','0');v.focus();" +
                "}catch(e){}})();",
                null
        );
    }

    private void exitNativeTvFullscreen() {
        if (webView == null || !nativeTvFullscreen) return;
        nativeTvFullscreen = false;
        webView.evaluateJavascript(
                "(function(){try{" +
                "document.body.classList.remove('__tv-native-tvfs');" +
                "window.__tvNativeVideoFullscreen=false;" +
                "var b=document.getElementById('nativeTvFullscreenBtn');if(b)b.textContent='⛶ Toàn màn hình TV';" +
                "var v=document.getElementById('tvVideo');if(v)v.blur();" +
                "var a=document.querySelector('.channel-btn.active');if(a&&a.focus)a.focus();" +
                "}catch(e){}})();",
                null
        );
        webView.requestFocus(View.FOCUS_DOWN);
        enterImmersiveMode();
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
        boolean gameFast = gamepadStateBridge != null && gamepadStateBridge.isLowLatencyModeNative();
        float flat = gameFast ? GAME_STICK_DEADZONE : Math.max(STICK_DEADZONE, range.getFlat());
        float abs = Math.abs(value);
        if (abs <= flat) return 0f;
        if (!gameFast) return clamp(value, -1f, 1f);

        // Remap the remaining stick travel back to 0..1 so movement begins immediately
        // after the small gameplay deadzone instead of feeling soft/sluggish.
        float scaled = (abs - flat) / Math.max(0.0001f, 1f - flat);
        return Math.copySign(clamp(scaled, 0f, 1f), value);
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
        value = clamp(value, 0f, 1f);

        // In active GAME mode make analog triggers react earlier without affecting menus.
        if (gamepadStateBridge != null &&
                gamepadStateBridge.isLowLatencyModeNative() &&
                value > 0f) {
            return (float) Math.sqrt(value);
        }
        return value;
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

    private boolean axisChanged(float oldValue, float newValue) {
        return Math.abs(oldValue - newValue) >= AXIS_CHANGE_EPSILON ||
                (oldValue != 0f && newValue == 0f) ||
                (oldValue == 0f && newValue != 0f);
    }

    private boolean shouldDispatchAxes(
            int deviceId,
            float lx, float ly, float rx, float ry,
            float hatX, float hatY, float lt, float rt
    ) {
        if (!hasLastAxes || deviceId != lastAxisDeviceId) {
            return true;
        }
        return axisChanged(lastLx, lx) ||
                axisChanged(lastLy, ly) ||
                axisChanged(lastRx, rx) ||
                axisChanged(lastRy, ry) ||
                axisChanged(lastHatX, hatX) ||
                axisChanged(lastHatY, hatY) ||
                axisChanged(lastLt, lt) ||
                axisChanged(lastRt, rt);
    }

    private void rememberAxes(
            int deviceId,
            float lx, float ly, float rx, float ry,
            float hatX, float hatY, float lt, float rt
    ) {
        hasLastAxes = true;
        lastAxisDeviceId = deviceId;
        lastLx = lx;
        lastLy = ly;
        lastRx = rx;
        lastRy = ry;
        lastHatX = hatX;
        lastHatY = hatY;
        lastLt = lt;
        lastRt = rt;
    }

    private void emitGamepadAxes(MotionEvent event) {
        if (webView == null) return;

        if (gamepadStateBridge != null && gamepadStateBridge.isLowLatencyModeNative()) {
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
            int deviceId = event.getDeviceId();
            if (deviceId != lastFastAxisDeviceId) {
                lastFastAxisDeviceId = deviceId;
                gamepadStateBridge.setDevice(controllerDeviceName(event.getDevice()));
            }
            gamepadStateBridge.setAxes(lx, ly, rx, ry, hatX, hatY, lt, rt);
            return;
        }

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

        int deviceId = event.getDeviceId();
        if (!shouldDispatchAxes(deviceId, lx, ly, rx, ry, hatX, hatY, lt, rt)) {
            return;
        }
        rememberAxes(deviceId, lx, ly, rx, ry, hatX, hatY, lt, rt);

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

        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                nativeTvFullscreen &&
                (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_BUTTON_B)) {
            exitNativeTvFullscreen();
            return true;
        }

        // Fullscreen media keeps Android Back for closing the fullscreen surface.
        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                keyCode == KeyEvent.KEYCODE_BACK &&
                customView != null) {
            hideCustomView();
            return true;
        }

        // GAME-only ultra-low-latency path: write native bit state directly.
        // No String mapping and no evaluateJavascript queue on gameplay input.
        if (isHomeVisible() &&
                gamepadStateBridge != null &&
                gamepadStateBridge.isLowLatencyModeNative() &&
                (isGameControllerSource(event.getSource()) || isHomeNavigationKey(keyCode))) {
            int deviceId = event.getDeviceId();
            if (deviceId != lastFastButtonDeviceId) {
                lastFastButtonDeviceId = deviceId;
                gamepadStateBridge.setDevice(controllerDeviceName(event.getDevice()));
            }
            gamepadStateBridge.setButtonCode(
                    keyCode,
                    event.getAction() == KeyEvent.ACTION_DOWN
            );
            return true;
        }

        // Keep the F710/native gamepad path that already works outside active gameplay.
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
            if (gamepadStateBridge != null && gamepadStateBridge.isLowLatencyModeNative() && webView != null) {
                // Ask Android not to batch subsequent motion samples while a game is active.
                // This reduces joystick latency on devices/firmware that buffer MotionEvents.
                try {
                    webView.requestUnbufferedDispatch(event);
                } catch (Exception ignored) {
                }
            }
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
            webView.resumeTimers();
            webView.requestFocus(View.FOCUS_DOWN);
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.pauseTimers();
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        nativeTvFullscreen = false;
        if (gamepadStateBridge != null) gamepadStateBridge.setLowLatencyMode(false);
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
