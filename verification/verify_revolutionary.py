
from playwright.sync_api import sync_playwright

def verify_app_revolutionary():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:4173", timeout=60000)

            # 1. Splash Screen Check
            try:
                page.wait_for_selector('text=INITIALIZING KERNEL...', timeout=10000)
                print("Splash screen detected")
                page.screenshot(path="verification/1_splash.png")
            except:
                print("Splash screen skipped or missed")

            # 2. Auth Screen Check (if not logged in)
            try:
                page.wait_for_selector('text=ROCKHOUND', timeout=10000)
                # Check for "Initialize Protocol" button
                if page.is_visible('button:has-text("Initialize Protocol")'):
                    print("Auth screen detected")
                    page.screenshot(path="verification/2_auth.png")

                    # Login
                    page.fill('input[type="email"]', "admin@rockhound.com")
                    page.fill('input[type="password"]', "admin")
                    page.click('button:has-text("Authenticate")')
            except:
                print("Auth screen not found or already logged in")

            # 3. Scanner View (Main HUD)
            page.wait_for_selector('text=SYSTEM ACTIVE', timeout=15000)
            print("Scanner HUD detected")
            page.screenshot(path="verification/3_scanner_hud.png")

            # 4. Admin Dashboard
            # Click the terminal icon in header
            page.click('header button:has(svg.lucide-terminal)')
            page.wait_for_selector('text=Mainframe Control', timeout=5000)
            print("Admin Dashboard detected")
            page.screenshot(path="verification/4_admin_dashboard.png")

            # Go Back
            page.click('button:has(svg.lucide-arrow-left)')

            # 5. Weather Dashboard
            # Click cloud icon
            page.click('header button:has(svg.lucide-cloud-sun)')
            page.wait_for_selector('text=Planetary Conditions', timeout=5000)
            print("Weather Dashboard detected")
            page.screenshot(path="verification/5_weather_dashboard.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_rev.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_revolutionary()
