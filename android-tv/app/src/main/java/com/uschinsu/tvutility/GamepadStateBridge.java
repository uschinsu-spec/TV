package com.uschinsu.tvutility;

import android.webkit.JavascriptInterface;

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

    // Rising-edge counters make very short button taps impossible to miss between 60 Hz frames.
    private volatile long aPress = 0L;
    private volatile long bPress = 0L;
    private volatile long xPress = 0L;
    private volatile long yPress = 0L;
    private volatile long startPress = 0L;

    @JavascriptInterface
    public void setLowLatencyMode(boolean enabled) {
        lowLatencyMode = enabled;
        if (!enabled) reset();
    }

    public boolean isLowLatencyModeNative() {
        return lowLatencyMode;
    }

    public void setDevice(String value) {
        device = value == null ? "" : value;
    }

    @JavascriptInterface
    public String getDevice() {
        return device;
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
            case "A":
                if (down && !a) aPress++;
                a = down;
                break;
            case "B":
                if (down && !b) bPress++;
                b = down;
                break;
            case "X":
                if (down && !x) xPress++;
                x = down;
                break;
            case "Y":
                if (down && !y) yPress++;
                y = down;
                break;
            case "L1": l1 = down; break;
            case "R1": r1 = down; break;
            case "L2": l2 = down; break;
            case "R2": r2 = down; break;
            case "SELECT": select = down; break;
            case "START":
                if (down && !start) startPress++;
                start = down;
                break;
            case "L3": l3 = down; break;
            case "R3": r3 = down; break;
            case "DPAD_UP": dpadUp = down; break;
            case "DPAD_DOWN": dpadDown = down; break;
            case "DPAD_LEFT": dpadLeft = down; break;
            case "DPAD_RIGHT": dpadRight = down; break;
            case "DPAD_CENTER":
                if (down && !dpadCenter) aPress++;
                dpadCenter = down;
                break;
            default: break;
        }
    }

    private int buttonMask() {
        int mask = 0;
        if (a) mask |= 1;
        if (b) mask |= 2;
        if (x) mask |= 4;
        if (y) mask |= 8;
        if (l1) mask |= 16;
        if (r1) mask |= 32;
        if (l2) mask |= 64;
        if (r2) mask |= 128;
        if (select) mask |= 256;
        if (start) mask |= 512;
        if (l3) mask |= 1024;
        if (r3) mask |= 2048;
        if (dpadUp) mask |= 4096;
        if (dpadDown) mask |= 8192;
        if (dpadLeft) mask |= 16384;
        if (dpadRight) mask |= 32768;
        if (dpadCenter) mask |= 65536;
        return mask;
    }

    @JavascriptInterface
    public String readPacked() {
        if (!lowLatencyMode) return "";
        StringBuilder s = new StringBuilder(128);
        s.append(lx).append('|')
                .append(ly).append('|')
                .append(rx).append('|')
                .append(ry).append('|')
                .append(hatX).append('|')
                .append(hatY).append('|')
                .append(lt).append('|')
                .append(rt).append('|')
                .append(buttonMask()).append('|')
                .append(aPress).append('|')
                .append(bPress).append('|')
                .append(xPress).append('|')
                .append(yPress).append('|')
                .append(startPress);
        return s.toString();
    }

    // Kept for backward compatibility with older cached web builds.
    @JavascriptInterface
    public String readState() {
        if (!lowLatencyMode) return "";
        StringBuilder s = new StringBuilder(256);
        s.append('{')
                .append("\"lx\":").append(lx)
                .append(",\"ly\":").append(ly)
                .append(",\"rx\":").append(rx)
                .append(",\"ry\":").append(ry)
                .append(",\"hatX\":").append(hatX)
                .append(",\"hatY\":").append(hatY)
                .append(",\"lt\":").append(lt)
                .append(",\"rt\":").append(rt)
                .append(",\"a\":").append(a)
                .append(",\"b\":").append(b)
                .append(",\"xButton\":").append(x)
                .append(",\"yButton\":").append(y)
                .append(",\"l1\":").append(l1)
                .append(",\"r1\":").append(r1)
                .append(",\"l2\":").append(l2)
                .append(",\"r2\":").append(r2)
                .append(",\"select\":").append(select)
                .append(",\"start\":").append(start)
                .append(",\"up\":").append(dpadUp)
                .append(",\"down\":").append(dpadDown)
                .append(",\"left\":").append(dpadLeft)
                .append(",\"right\":").append(dpadRight)
                .append(",\"dpadCenter\":").append(dpadCenter)
                .append('}');
        return s.toString();
    }

    private synchronized void reset() {
        lx = ly = rx = ry = hatX = hatY = lt = rt = 0f;
        a = b = x = y = l1 = r1 = l2 = r2 = select = start = l3 = r3 = false;
        dpadUp = dpadDown = dpadLeft = dpadRight = dpadCenter = false;
        aPress = bPress = xPress = yPress = startPress = 0L;
    }
}
