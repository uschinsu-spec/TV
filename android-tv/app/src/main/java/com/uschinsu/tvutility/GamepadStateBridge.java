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

    // Sticky one-read pulses prevent ultra-fast taps from disappearing between JS frames.
    private volatile boolean aPulse = false;
    private volatile boolean bPulse = false;
    private volatile boolean xPulse = false;
    private volatile boolean yPulse = false;
    private volatile boolean startPulse = false;
    private volatile boolean upPulse = false;
    private volatile boolean downPulse = false;
    private volatile boolean leftPulse = false;
    private volatile boolean rightPulse = false;
    private volatile boolean centerPulse = false;

    @JavascriptInterface
    public synchronized void setLowLatencyMode(boolean enabled) {
        lowLatencyMode = enabled;
        if (!enabled) resetLocked();
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

    public synchronized void setButton(String name, boolean down) {
        if (name == null) return;
        switch (name) {
            case "A":
                if (down && !a) aPulse = true;
                a = down;
                break;
            case "B":
                if (down && !b) bPulse = true;
                b = down;
                break;
            case "X":
                if (down && !x) xPulse = true;
                x = down;
                break;
            case "Y":
                if (down && !y) yPulse = true;
                y = down;
                break;
            case "L1": l1 = down; break;
            case "R1": r1 = down; break;
            case "L2": l2 = down; break;
            case "R2": r2 = down; break;
            case "SELECT": select = down; break;
            case "START":
                if (down && !start) startPulse = true;
                start = down;
                break;
            case "L3": l3 = down; break;
            case "R3": r3 = down; break;
            case "DPAD_UP":
                if (down && !dpadUp) upPulse = true;
                dpadUp = down;
                break;
            case "DPAD_DOWN":
                if (down && !dpadDown) downPulse = true;
                dpadDown = down;
                break;
            case "DPAD_LEFT":
                if (down && !dpadLeft) leftPulse = true;
                dpadLeft = down;
                break;
            case "DPAD_RIGHT":
                if (down && !dpadRight) rightPulse = true;
                dpadRight = down;
                break;
            case "DPAD_CENTER":
                if (down && !dpadCenter) centerPulse = true;
                dpadCenter = down;
                break;
            default: break;
        }
    }

    private int buttonMask(
            boolean outA, boolean outB, boolean outX, boolean outY,
            boolean outUp, boolean outDown, boolean outLeft, boolean outRight,
            boolean outCenter, boolean outStart
    ) {
        int mask = 0;
        if (outA) mask |= 1;
        if (outB) mask |= 2;
        if (outX) mask |= 4;
        if (outY) mask |= 8;
        if (l1) mask |= 16;
        if (r1) mask |= 32;
        if (l2) mask |= 64;
        if (r2) mask |= 128;
        if (select) mask |= 256;
        if (outStart) mask |= 512;
        if (l3) mask |= 1024;
        if (r3) mask |= 2048;
        if (outUp) mask |= 4096;
        if (outDown) mask |= 8192;
        if (outLeft) mask |= 16384;
        if (outRight) mask |= 32768;
        if (outCenter) mask |= 65536;
        return mask;
    }

    @JavascriptInterface
    public synchronized String readPacked() {
        if (!lowLatencyMode) return "";
        boolean outA = a || aPulse;
        boolean outB = b || bPulse;
        boolean outX = x || xPulse;
        boolean outY = y || yPulse;
        boolean outStart = start || startPulse;
        boolean outUp = dpadUp || upPulse;
        boolean outDown = dpadDown || downPulse;
        boolean outLeft = dpadLeft || leftPulse;
        boolean outRight = dpadRight || rightPulse;
        boolean outCenter = dpadCenter || centerPulse;
        int mask = buttonMask(outA, outB, outX, outY, outUp, outDown, outLeft, outRight, outCenter, outStart);
        clearPulsesLocked();
        return new StringBuilder(112)
                .append(lx).append('|')
                .append(ly).append('|')
                .append(rx).append('|')
                .append(ry).append('|')
                .append(hatX).append('|')
                .append(hatY).append('|')
                .append(lt).append('|')
                .append(rt).append('|')
                .append(mask)
                .toString();
    }

    // Current TV web builds use this API. It keeps compatibility while using
    // native sticky button pulses so fast taps are still visible for one read.
    @JavascriptInterface
    public synchronized String readState() {
        if (!lowLatencyMode) return "";
        boolean outA = a || aPulse;
        boolean outB = b || bPulse;
        boolean outX = x || xPulse;
        boolean outY = y || yPulse;
        boolean outStart = start || startPulse;
        boolean outUp = dpadUp || upPulse;
        boolean outDown = dpadDown || downPulse;
        boolean outLeft = dpadLeft || leftPulse;
        boolean outRight = dpadRight || rightPulse;
        boolean outCenter = dpadCenter || centerPulse;

        String value = new StringBuilder(240)
                .append('{')
                .append("\"lx\":").append(lx)
                .append(",\"ly\":").append(ly)
                .append(",\"rx\":").append(rx)
                .append(",\"ry\":").append(ry)
                .append(",\"hatX\":").append(hatX)
                .append(",\"hatY\":").append(hatY)
                .append(",\"lt\":").append(lt)
                .append(",\"rt\":").append(rt)
                .append(",\"a\":").append(outA)
                .append(",\"b\":").append(outB)
                .append(",\"xButton\":").append(outX)
                .append(",\"yButton\":").append(outY)
                .append(",\"l1\":").append(l1)
                .append(",\"r1\":").append(r1)
                .append(",\"l2\":").append(l2)
                .append(",\"r2\":").append(r2)
                .append(",\"select\":").append(select)
                .append(",\"start\":").append(outStart)
                .append(",\"up\":").append(outUp)
                .append(",\"down\":").append(outDown)
                .append(",\"left\":").append(outLeft)
                .append(",\"right\":").append(outRight)
                .append(",\"dpadCenter\":").append(outCenter)
                .append('}')
                .toString();

        clearPulsesLocked();
        return value;
    }

    private void clearPulsesLocked() {
        aPulse = bPulse = xPulse = yPulse = startPulse = false;
        upPulse = downPulse = leftPulse = rightPulse = centerPulse = false;
    }

    private void resetLocked() {
        lx = ly = rx = ry = hatX = hatY = lt = rt = 0f;
        a = b = x = y = l1 = r1 = l2 = r2 = select = start = l3 = r3 = false;
        dpadUp = dpadDown = dpadLeft = dpadRight = dpadCenter = false;
        clearPulsesLocked();
    }
}
