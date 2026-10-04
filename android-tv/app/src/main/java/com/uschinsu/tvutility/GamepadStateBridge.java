package com.uschinsu.tvutility;

import android.webkit.JavascriptInterface;

import java.util.Locale;

public final class GamepadStateBridge {

    private volatile boolean lowLatencyMode = false;
    private volatile String device = "";

    private volatile float lx = 0f;
    private volatile float ly = 0f;
    private volatile float rx = 0f;
    private volatile float ry = 0f;
    private volatile float hatX = 0f;
    private volatile float hatY = 0f;
    private volatile float lt = 0f;
    private volatile float rt = 0f;

    private volatile boolean a = false;
    private volatile boolean b = false;
    private volatile boolean x = false;
    private volatile boolean y = false;
    private volatile boolean l1 = false;
    private volatile boolean r1 = false;
    private volatile boolean l2 = false;
    private volatile boolean r2 = false;
    private volatile boolean select = false;
    private volatile boolean start = false;
    private volatile boolean l3 = false;
    private volatile boolean r3 = false;
    private volatile boolean dpadUp = false;
    private volatile boolean dpadDown = false;
    private volatile boolean dpadLeft = false;
    private volatile boolean dpadRight = false;
    private volatile boolean dpadCenter = false;

    @JavascriptInterface
    public void setLowLatencyMode(boolean enabled) {
        lowLatencyMode = enabled;
        if (!enabled) {
            reset();
        }
    }

    public boolean isLowLatencyModeNative() {
        return lowLatencyMode;
    }

    public void setDevice(String value) {
        device = value == null ? "" : value;
    }

    public void setAxes(
            float lx, float ly, float rx, float ry,
            float hatX, float hatY, float lt, float rt
    ) {
        this.lx = lx;
        this.ly = ly;
        this.rx = rx;
        this.ry = ry;
        this.hatX = hatX;
        this.hatY = hatY;
        this.lt = lt;
        this.rt = rt;
    }

    public void setButton(String name, boolean down) {
        if (name == null) return;
        switch (name) {
            case "A": a = down; break;
            case "B": b = down; break;
            case "X": x = down; break;
            case "Y": y = down; break;
            case "L1": l1 = down; break;
            case "R1": r1 = down; break;
            case "L2": l2 = down; break;
            case "R2": r2 = down; break;
            case "SELECT": select = down; break;
            case "START": start = down; break;
            case "L3": l3 = down; break;
            case "R3": r3 = down; break;
            case "DPAD_UP": dpadUp = down; break;
            case "DPAD_DOWN": dpadDown = down; break;
            case "DPAD_LEFT": dpadLeft = down; break;
            case "DPAD_RIGHT": dpadRight = down; break;
            case "DPAD_CENTER": dpadCenter = down; break;
            default: break;
        }
    }

    @JavascriptInterface
    public String readState() {
        if (!lowLatencyMode) return "";
        return "{" +
                "\"lx\":" + number(lx) +
                ",\"ly\":" + number(ly) +
                ",\"rx\":" + number(rx) +
                ",\"ry\":" + number(ry) +
                ",\"hatX\":" + number(hatX) +
                ",\"hatY\":" + number(hatY) +
                ",\"lt\":" + number(lt) +
                ",\"rt\":" + number(rt) +
                ",\"a\":" + a +
                ",\"b\":" + b +
                ",\"xButton\":" + x +
                ",\"yButton\":" + y +
                ",\"l1\":" + l1 +
                ",\"r1\":" + r1 +
                ",\"l2\":" + l2 +
                ",\"r2\":" + r2 +
                ",\"select\":" + select +
                ",\"start\":" + start +
                ",\"l3\":" + l3 +
                ",\"r3\":" + r3 +
                ",\"up\":" + dpadUp +
                ",\"down\":" + dpadDown +
                ",\"left\":" + dpadLeft +
                ",\"right\":" + dpadRight +
                ",\"dpadCenter\":" + dpadCenter +
                ",\"device\":\"" + escape(device) + "\"" +
                "}";
    }

    private synchronized void reset() {
        lx = ly = rx = ry = hatX = hatY = lt = rt = 0f;
        a = b = x = y = l1 = r1 = l2 = r2 = select = start = l3 = r3 = false;
        dpadUp = dpadDown = dpadLeft = dpadRight = dpadCenter = false;
    }

    private String number(float value) {
        return String.format(Locale.US, "%.4f", value);
    }

    private String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", " ")
                .replace("\r", " ");
    }
}
