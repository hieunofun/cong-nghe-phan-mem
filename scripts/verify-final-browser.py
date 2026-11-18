"""Capture live screenshots of the upgraded 9-container stack (8-stage Jenkins, 13-panel Grafana, 5-rule Prometheus)."""
import json
import time
from pathlib import Path
import sys

sys.path.insert(0, 'E:/site-packages')
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FINAL_OUT = ROOT / 'artifacts' / 'final-demo'
MIDTERM_OUT = ROOT / 'artifacts' / 'midterm-demo'
FINAL_OUT.mkdir(parents=True, exist_ok=True)
MIDTERM_OUT.mkdir(parents=True, exist_ok=True)

SECRETS = dict(
    line.split('=', 1)
    for line in (ROOT / '.devops/credentials.env').read_text(encoding='utf-8').splitlines()
    if '=' in line
)


def app_checks(browser):
    results = []
    # Generate realistic traffic through Nginx Gateway (:8088) so white-box RPS & p95 charts have rich data!
    context = browser.new_context(viewport={'width': 1440, 'height': 920})
    page = context.new_page()
    page.goto('http://localhost:8088', wait_until='networkidle')
    page.get_by_text('Lập trình viên Backend Node.js', exact=False).first.wait_for(timeout=20000)
    page.screenshot(path=str(FINAL_OUT / 'web-home.png'), full_page=False)
    context.close()
    print('PASS browser: Nginx Gateway home renders seeded jobs')

    for role, email, password in [
        ('candidate', 'candidate@joblink.vn', 'Candidate@123'),
        ('company', 'hr@vietsoft.vn', 'Company@123'),
        ('admin', 'admin@joblink.vn', 'Admin@123')
    ]:
        context = browser.new_context(viewport={'width': 1440, 'height': 960})
        page = context.new_page()
        errors, failed_api = [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on(
            'response',
            lambda response: failed_api.append(f'{response.status} {response.url}')
            if '/api/' in response.url and response.status >= 400 else None
        )
        page.goto('http://localhost:8088/login.html', wait_until='networkidle')
        page.locator('#email').fill(email)
        page.locator('#password').fill(password)
        page.locator('#submit-btn').click()
        page.wait_for_url(f'**/{role}-dashboard.html', timeout=20000)
        page.wait_for_load_state('networkidle')
        if role == 'candidate':
            assert page.locator('#full_name').input_value(), 'Empty candidate profile'
        page.screenshot(path=str(FINAL_OUT / f'web-{role}.png'), full_page=True)
        assert not errors, errors
        assert not failed_api, failed_api
        results.append({'role': role, 'javascriptErrors': errors, 'failedApi': failed_api})
        print(f'PASS browser: {role} login and dashboard via Gateway :8088')
        context.close()
    return results


def devops_screens(browser):
    # 1. Jenkins 8-Stage View (wide viewport so all 8 stages + Post Actions fit cleanly!)
    context = browser.new_context(viewport={'width': 1860, 'height': 960})
    page = context.new_page()
    page.goto('http://localhost:8080/login', wait_until='domcontentloaded')
    page.locator('input[name="j_username"]').fill('admin')
    page.locator('input[name="j_password"]').fill(SECRETS['JENKINS_ADMIN_PASSWORD'])
    page.locator('button[name="Submit"], button[type="submit"]').first.click()
    page.wait_for_url(lambda url: '/login' not in url, timeout=30000)
    page.goto('http://localhost:8080/job/joblink-scm/', wait_until='networkidle')
    page.get_by_text('Stage View', exact=False).first.wait_for(timeout=30000)
    time.sleep(1.5)
    stage_box = page.get_by_text('Stage View', exact=True).first.bounding_box()
    clip_x = max(0, stage_box['x'] - 15)
    clip_y = max(0, stage_box['y'] - 12)
    clip_w = min(1860 - clip_x, 1480)
    for out_dir in (FINAL_OUT, MIDTERM_OUT):
        page.screenshot(
            path=str(out_dir / 'jenkins-pipeline.png'),
            clip={'x': clip_x, 'y': clip_y, 'width': clip_w, 'height': 370}
        )
    print('PASS browser: Jenkins 8-stage pipeline screenshot captured')
    context.close()

    # 2. Grafana 13-Panel Dashboard
    context = browser.new_context(viewport={'width': 1600, 'height': 1320}, color_scheme='dark')
    page = context.new_page()
    page.goto('http://localhost:3001/login', wait_until='networkidle')
    page.locator('input[name="user"]').fill('admin')
    page.locator('input[name="password"]').fill(SECRETS['GRAFANA_ADMIN_PASSWORD'])
    page.get_by_role('button', name='Log in', exact=True).click()
    page.wait_for_url(lambda url: '/login' not in url, timeout=30000)
    page.goto('http://localhost:3001/d/joblink-overview?orgId=1&kiosk', wait_until='networkidle')
    page.get_by_text('Gateway / Nginx', exact=False).first.wait_for(timeout=30000)
    page.get_by_text('UP', exact=True).first.wait_for(timeout=30000)
    time.sleep(3)
    for out_dir in (FINAL_OUT, MIDTERM_OUT):
        page.screenshot(path=str(out_dir / 'grafana-dashboard.png'), full_page=True)
    print('PASS browser: Grafana 13-panel dashboard screenshot captured')
    context.close()

    # 3. Prometheus 5 Alert Rules
    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    page.goto('http://localhost:9090/alerts', wait_until='networkidle', timeout=60000)
    page.get_by_text('JobLinkServiceDown', exact=False).first.wait_for(timeout=30000)
    page.get_by_text('JobLinkHighMemoryUsage', exact=False).first.wait_for(timeout=30000)
    time.sleep(1.5)
    for out_dir in (FINAL_OUT, MIDTERM_OUT):
        page.screenshot(path=str(out_dir / 'prometheus-alerts.png'), full_page=True)
    print('PASS browser: Prometheus 5 alert rules screenshot captured')
    context.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        edge = Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
        browser = p.chromium.launch(
            headless=True,
            **({'executable_path': str(edge)} if edge.exists() else {})
        )
        result = app_checks(browser)
        (FINAL_OUT / 'browser-checks.json').write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8'
        )
        devops_screens(browser)
        browser.close()
