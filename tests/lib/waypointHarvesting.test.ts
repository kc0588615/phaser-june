import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { routeDistanceKm, satisfiesResearchSiteSpacing } from '@/expedition/siteSpacing';

describe('research-site spacing', () => {
  test('accepts three sites within the preferred 150-800 km window', () => {
    const sites = [{ lon: 0, lat: 0 }, { lon: 2, lat: 0 }, { lon: 1, lat: 2 }];
    assert.equal(satisfiesResearchSiteSpacing(sites), true);
  });

  test('supports the explicit 100 km fallback floor', () => {
    const sites = [{ lon: 0, lat: 0 }, { lon: 1, lat: 0 }, { lon: 0.5, lat: 1 }];
    assert.equal(satisfiesResearchSiteSpacing(sites), false);
    assert.equal(satisfiesResearchSiteSpacing(sites, 100), true);
  });

  test('rejects clustered and over-wide routes', () => {
    assert.equal(satisfiesResearchSiteSpacing([{ lon: 0, lat: 0 }, { lon: 0.1, lat: 0 }, { lon: 0, lat: 0.1 }]), false);
    assert.equal(satisfiesResearchSiteSpacing([{ lon: 0, lat: 0 }, { lon: 10, lat: 0 }, { lon: 0, lat: 10 }]), false);
    assert.ok(routeDistanceKm({ lon: 0, lat: 0 }, { lon: 1, lat: 0 }) > 110);
  });
});
