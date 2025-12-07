
from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Go to the app
            page.goto("http://localhost:4173")

            # Wait for content to load (e.g., login screen or scanner)
            # Since the mock server is enabled, it might auto-login or show auth screen.
            # App.tsx says: if (!user) return <Auth ... />

            # Check if Auth screen is visible
            try:
                page.wait_for_selector('text=Access Protocol', timeout=5000)
                print("Auth screen detected")
                page.screenshot(path="verification/1_auth_screen.png")

                # Try to login
                page.fill('input[type="email"]', "admin@rockhound.com")
                page.fill('input[type="password"]', "admin")
                page.click('button:has-text("Initialize Session")')
            except:
                print("Auth screen not found or already logged in")

            # Wait for Scanner view (default view)
            page.wait_for_selector('text=SYSTEM ACTIVE', timeout=10000)
            print("Scanner view detected")
            page.screenshot(path="verification/2_scanner_view.png")

            # Navigate to Profile
            # The header has the username and avatar which is clickable
            page.click('header div.cursor-pointer')
            page.wait_for_selector('text=Operative Profile', timeout=5000)
            print("Profile view detected")
            page.screenshot(path="verification/3_profile_view.png")

            # Close profile
            page.click('button:has(svg.lucide-x)')

            # Navigate to Collection (Vault)
            # Floating dock button with Box icon
            page.click('button:has(svg.lucide-box)')
            page.wait_for_selector('text=Vault', timeout=5000)
            print("Collection view detected")
            page.screenshot(path="verification/4_collection_view.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
