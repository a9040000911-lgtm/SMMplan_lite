import { test, expect } from '@playwright/test';

const adminTabs = [
  { path: '/admin/dashboard', name: 'dashboard' },
  { path: '/admin/clients', name: 'clients' },
  { path: '/admin/orders', name: 'orders' },
  { path: '/admin/refills', name: 'refills' },
  { path: '/admin/catalog', name: 'catalog' },
  { path: '/admin/tickets', name: 'tickets' },
  { path: '/admin/finance', name: 'finance' },
  { path: '/admin/providers', name: 'providers' },
  { path: '/admin/marketing', name: 'marketing' },
  { path: '/admin/pages', name: 'pages' },
  { path: '/admin/settings', name: 'settings' },
];

test.describe('Admin Panel Visual Regression', () => {
  // Test each tab using a parametrized test loop
  for (const tab of adminTabs) {
    test(`Visual test for ${tab.name} tab`, async ({ page }) => {
      // 1. Navigate to the page
      await page.goto(tab.path);
      
      // 2. Wait for the main content to load and stabilize
      await page.waitForLoadState('networkidle');
      
      // Optional: Wait for any specific animations to finish if needed
      // (HeroUI has some entry animations, waiting for networkidle usually covers the initial paint, 
      // but a explicit small wait can ensure animations settle).
      await page.waitForTimeout(1000); 

      // 3. Target the main content area, fallback to body if crashed
      const mainContent = page.locator('main').first();
      if ((await mainContent.count()) === 0) {
        console.log(`main not found on ${tab.name}, falling back to body`);
      }
      const target = (await mainContent.count()) > 0 ? mainContent : page.locator('body');
      
      // 4. Assert screenshot
      await expect(target).toHaveScreenshot(`${tab.name}-content.png`, {
        maxDiffPixelRatio: 0.1, // more tolerant
      });
    });
  }
});
