
from playwright.sync_api import sync_playwright

def verify_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:4173", timeout=60000)

            # Wait for Splash to finish (should be faster now)
            # We look for something unique to the Auth page or Scanner
            try:
                page.wait_for_selector('text=ROCKHOUND', timeout=10000) # Auth page title
                print("App loaded successfully (Auth screen)")
                page.screenshot(path="verification/fixed_load.png")
            except:
                # If already logged in, check for scanner
                try:
                    page.wait_for_selector('text=SYSTEM ACTIVE', timeout=10000)
                    print("App loaded successfully (Scanner)")
                    page.screenshot(path="verification/fixed_load.png")
                except:
                    print("Still stuck or unknown state")
                    page.screenshot(path="verification/still_stuck.png")
                    print(page.content()[:500])

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_fix()
