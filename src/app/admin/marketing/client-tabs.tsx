'use client';

import * as React from 'react';
import { Tabs } from '@heroui/react';

interface MarketingTabsProps {
  promocodesContent: React.ReactNode;
  referralsContent: React.ReactNode;
}

export function MarketingTabs({ promocodesContent, referralsContent }: MarketingTabsProps) {
  return (
    <Tabs>
      <Tabs.ListContainer>
        <Tabs.List aria-label="Маркетинг">
          <Tabs.Tab id="promocodes">Промокоды<Tabs.Indicator /></Tabs.Tab>
          <Tabs.Tab id="referrals">Партнерская программа<Tabs.Indicator /></Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="promocodes">
        <div className="pt-4">{promocodesContent}</div>
      </Tabs.Panel>
      <Tabs.Panel id="referrals">
        <div className="pt-4">{referralsContent}</div>
      </Tabs.Panel>
    </Tabs>
  );
}
