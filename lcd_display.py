"""16x2 character LCD (I2C backpack) helper.

Run it directly to test the screen:   python lcd_display.py
Imported by pi_server.py to show each prediction on the LCD.
If no LCD is connected, every function quietly does nothing,
so the server still works without the display.
"""
import threading
import time

_lock = threading.Lock()
_lcd = None


def _init():
    global _lcd
    try:
        from RPLCD.i2c import CharLCD
    except Exception as e:
        print("LCD library not available:", e)
        return

    last_error = None
    # Most I2C backpacks use address 0x27 or 0x3F, so try both
    for addr in (0x27, 0x3F):
        try:
            _lcd = CharLCD('PCF8574', addr, port=1, cols=16, rows=2,
                           charmap='A02', auto_linebreaks=False)
            _lcd.clear()
            print(f"LCD found at address {hex(addr)}")
            return
        except Exception as e:
            last_error = e
    print("LCD not available:", last_error)


_init()


def show(line1='', line2=''):
    """Write two lines of up to 16 characters each."""
    if _lcd is None:
        return
    with _lock:
        try:
            _lcd.cursor_pos = (0, 0)
            _lcd.write_string(str(line1)[:16].ljust(16))
            _lcd.cursor_pos = (1, 0)
            _lcd.write_string(str(line2)[:16].ljust(16))
        except Exception as e:
            print("LCD write failed:", e)


def show_ready():
    show('Wafer Inspector', 'Ready')


def show_result(defect, confidence, severity, ms):
    # Line 1: defect type + confidence   e.g. "Scratch   100.0%"
    # Line 2: verdict + inference time   e.g. "REJECT      55 ms"
    show(f"{defect[:10]:<10}{confidence:5.1f}%",
         f"{severity.upper():<8}{ms:>5} ms")


if __name__ == '__main__':
    show('LCD test', 'Hello Wafer!')
    time.sleep(2)
    show_result('Scratch', 100.0, 'Reject', 55)
    time.sleep(2)
    show_result('none', 91.4, 'Pass', 54)
    time.sleep(2)
    show_ready()
    print("Test finished. The LCD should now show: Wafer Inspector / Ready")
