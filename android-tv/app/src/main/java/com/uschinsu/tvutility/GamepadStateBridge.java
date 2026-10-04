package com.uschinsu.tvutility;

import android.view.KeyEvent;
import android.webkit.JavascriptInterface;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lock-free controller state shared between Android's input thread and WebView's
 * JavaScript bridge thread. Gameplay never queues evaluateJavascript calls.
 */
public final class GamepadStateBridge {

    private static final int BTN_A = 1;
    private static final int BTN_B = 2;
    private static final int BTN_X = 4;
    private static final int BTN_Y = 8;
    private static final int BTN_L1 = 16;
    private static final int BTN_R1 = 32;
    private static final int BTN_L2 = 64;
    private static final int BTN_R2 = 128;
    private static final int BTN_SELECT = 256;
    private static final int BTN_START = 512;
    private static final int BTN_L3 = 1024;
    private static final int BTN_R3 = 2048;
    private static final int BTN_UP = 4096;
    private static final int BTN_DOWN = 8192;
    private static final int BTN_LEFT = 16384;
    private static final int BTN_RIGHT = 32768;
    private static final int BTN_CENTER = 65536;

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

    // Current held buttons + sticky one-read pulses for very short taps.
    // Atomic bitmasks avoid synchronized monitor contention between WebView JS
    // and Android input delivery.
    private final AtomicInteger buttons = new AtomicInteger(0);
    private final AtomicInteger pulses = new AtomicInteger(0);

    @JavascriptInterface
    public void setLowLatencyMode(boolean enabled) {
        lowLatencyMode = enabled;
        if (!enabled) resetNative();
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

    private static void atomicOr(AtomicInteger target, int bit) {
        int oldValue;
        int newValue;
        do {
            oldValue = target.get();
            newValue = oldValue | bit;
            if (oldValue == newValue) return;
        } while (!target.compareAndSet(oldValue, newValue));
    }

    private static void atomicAndNot(AtomicInteger target, int bit) {
        int oldValue;
        int newValue;
        do {
            oldValue = target.get();
            newValue = oldValue & ~bit;
            if (oldValue == newValue) return;
        } while (!target.compareAndSet(oldValue, newValue));
    }

    private void updateButton(int bit, boolean down) {
        if (bit == 0) return;
        if (down) {
            int oldValue;
            int newValue;
            do {
                oldValue = buttons.get();
                newValue = oldValue | bit;
                if (oldValue == newValue) return;
            } while (!buttons.compareAndSet(oldValue, newValue));
            // Preserve the rising edge until JavaScript has consumed one sample.
            atomicOr(pulses, bit);
        } else {
            atomicAndNot(buttons, bit);
        }
    }

    private int bitForKeyCode(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return BTN_A;
            case KeyEvent.KEYCODE_BUTTON_B:
            case KeyEvent.KEYCODE_BACK: return BTN_B;
            case KeyEvent.KEYCODE_BUTTON_X: return BTN_X;
            case KeyEvent.KEYCODE_BUTTON_Y: return BTN_Y;
            case KeyEvent.KEYCODE_BUTTON_L1: return BTN_L1;
            case KeyEvent.KEYCODE_BUTTON_R1: return BTN_R1;
            case KeyEvent.KEYCODE_BUTTON_L2: return BTN_L2;
            case KeyEvent.KEYCODE_BUTTON_R2: return BTN_R2;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return BTN_SELECT;
            case KeyEvent.KEYCODE_BUTTON_START: return BTN_START;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return BTN_L3;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return BTN_R3;
            case KeyEvent.KEYCODE_DPAD_UP: return BTN_UP;
            case KeyEvent.KEYCODE_DPAD_DOWN: return BTN_DOWN;
            case KeyEvent.KEYCODE_DPAD_LEFT: return BTN_LEFT;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return BTN_RIGHT;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_SPACE:
                return BTN_CENTER;
            default: return 0;
        }
    }

    public boolean setButtonCode(int keyCode, boolean down) {
        int bit = bitForKeyCode(keyCode);
        if (bit == 0) return false;
        updateButton(bit, down);
        return true;
    }

    // Compatibility path for any older native caller.
    public void setButton(String name, boolean down) {
        if (name == null) return;
        int bit;
        switch (name) {
            case "A": bit = BTN_A; break;
            case "B": bit = BTN_B; break;
            case "X": bit = BTN_X; break;
            case "Y": bit = BTN_Y; break;
            case "L1": bit = BTN_L1; break;
            case "R1": bit = BTN_R1; break;
            case "L2": bit = BTN_L2; break;
            case "R2": bit = BTN_R2; break;
            case "SELECT": bit = BTN_SELECT; break;
            case "START": bit = BTN_START; break;
            case "L3": bit = BTN_L3; break;
            case "R3": bit = BTN_R3; break;
            case "DPAD_UP": bit = BTN_UP; break;
            case "DPAD_DOWN": bit = BTN_DOWN; break;
            case "DPAD_LEFT": bit = BTN_LEFT; break;
            case "DPAD_RIGHT": bit = BTN_RIGHT; break;
            case "DPAD_CENTER": bit = BTN_CENTER; break;
            default: bit = 0; break;
        }
        updateButton(bit, down);
    }

    private int snapshotButtons() {
        // Pulses arriving after getAndSet(0) remain queued for the next JS read.
        return buttons.get() | pulses.getAndSet(0);
    }

    @JavascriptInterface
    public String readPacked() {
        if (!lowLatencyMode) return "";
        int mask = snapshotButtons();
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

    // Compatibility API used by current web builds. It is now lock-free even
    // before the web switches to the faster readPacked() format.
    @JavascriptInterface
    public String readState() {
        if (!lowLatencyMode) return "";
        int mask = snapshotButtons();

        return new StringBuilder(224)
                .append('{')
                .append("\"lx\":").append(lx)
                .append(",\"ly\":").append(ly)
                .append(",\"rx\":").append(rx)
                .append(",\"ry\":").append(ry)
                .append(",\"hatX\":").append(hatX)
                .append(",\"hatY\":").append(hatY)
                .append(",\"lt\":").append(lt)
                .append(",\"rt\":").append(rt)
                .append(",\"a\":").append((mask & BTN_A) != 0)
                .append(",\"b\":").append((mask & BTN_B) != 0)
                .append(",\"xButton\":").append((mask & BTN_X) != 0)
                .append(",\"yButton\":").append((mask & BTN_Y) != 0)
                .append(",\"l1\":").append((mask & BTN_L1) != 0)
                .append(",\"r1\":").append((mask & BTN_R1) != 0)
                .append(",\"l2\":").append((mask & BTN_L2) != 0)
                .append(",\"r2\":").append((mask & BTN_R2) != 0)
                .append(",\"select\":").append((mask & BTN_SELECT) != 0)
                .append(",\"start\":").append((mask & BTN_START) != 0)
                .append(",\"up\":").append((mask & BTN_UP) != 0)
                .append(",\"down\":").append((mask & BTN_DOWN) != 0)
                .append(",\"left\":").append((mask & BTN_LEFT) != 0)
                .append(",\"right\":").append((mask & BTN_RIGHT) != 0)
                .append(",\"dpadCenter\":").append((mask & BTN_CENTER) != 0)
                .append('}')
                .toString();
    }

    private void resetNative() {
        lx = ly = rx = ry = hatX = hatY = lt = rt = 0f;
        buttons.set(0);
        pulses.set(0);
    }
}
