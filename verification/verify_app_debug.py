
from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:4173", timeout=60000)

            print("Waiting for body...")
            page.wait_for_selector('body', timeout=10000)

            # Take a screenshot of whatever is there
            page.screenshot(path="verification/debug_state.png")

            # Print page title and some text content
            print(f"Page Title: {page.title()}")
            content = page.content()
            print(f"Page Content Snippet: {content[:500]}")

            # Check for specific elements again
            if "Access Protocol" in content:
                 print("Auth screen detected via text check")
            elif "SYSTEM ACTIVE" in content:
                 print("Scanner view detected via text check")
            else:
                 print("Unknown state")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app()
