# Testing Guide

## Motion Command Test Suite

### Basic Motions

Test these commands to validate core functionality:

#### Head Control
- `look left`
- `look right`
- `look up`
- `look down`
- `nod head`
- `shake head`
- `tilt head left`
- `tilt head right`

#### Arm Movements
- `wave right hand`
- `wave left hand`
- `raise right arm`
- `raise left arm`
- `raise both arms`
- `lower arms`
- `cross arms`

#### Body Posture
- `lean forward`
- `lean back`
- `lean left`
- `lean right`
- `stand straight`
- `bow`

#### Leg Movements
- `step forward`
- `step back`
- `shift weight left`
- `shift weight right`

#### Complex Motions
- `wave and nod`
- `bow deeply`
- `stretch arms up`
- `look around`
- `dance move`

### Expected Motion DSL Output

Each command should produce valid Motion DSL JSON:

```json
{
  "gestures": [
    {
      "t": <number>,
      "bone": <valid_bone_name>,
      "action": <valid_action>,
      "axis": "x" | "y" | "z",
      "amplitude": <0-1>,
      "dir": <valid_direction>,
      "dur": <number>,
      "ease": "in" | "out" | "inout"
    }
  ],
  "duration_hint": <number>
}
```

### Validation Checklist

For each command, verify:

- [ ] Motion DSL is valid JSON
- [ ] All gestures have required fields (t, bone, action)
- [ ] Bone names are from allowed enum
- [ ] Amplitudes are between 0 and 1
- [ ] Joint rotations stay under 45°
- [ ] Easing is applied (smooth motion)
- [ ] Duration is reasonable (0.1s - 5s)
- [ ] No bone distortion or clipping
- [ ] Motion completes as expected
- [ ] Character returns to stable pose

### Performance Testing

#### Frame Rate
1. Open browser DevTools
2. Enable FPS meter
3. Execute multiple motions
4. Target: 30-50 FPS

#### Latency
1. Enter command
2. Measure time to motion start
3. Target: < 500ms total latency
   - AI generation: ~200ms
   - Rendering: ~50ms

#### Stress Test
```javascript
// In browser console
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    document.querySelector('input').value = 'wave right hand';
    document.querySelector('button[type="submit"]').click();
  }, i * 2000);
}
```

### Safety Testing

#### Joint Limits
Test extreme commands:
- `rotate head 360 degrees`
- `bend spine backwards completely`
- `twist arms`

Expected: All motions should be clamped to safe limits (45° max).

#### Collision Detection
- Verify no self-intersection
- Check bone hierarchy integrity
- Ensure limbs don't pass through body

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Device Testing

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### API Testing

#### Manual Test
```bash
curl -X POST http://localhost:3000/api/motion \
  -H "Content-Type: application/json" \
  -d '{"command": "wave right hand"}'
```

Expected response:
```json
{
  "gestures": [...],
  "duration_hint": 1.6
}
```

#### Error Handling
```bash
# Test empty command
curl -X POST http://localhost:3000/api/motion \
  -H "Content-Type: application/json" \
  -d '{"command": ""}'

# Test invalid command
curl -X POST http://localhost:3000/api/motion \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Integration Testing

1. **Full Flow Test**
   - Enter command → Submit → AI processes → Motion plays → Character animates
   - Verify no errors in console
   - Check network tab for API calls
   - Confirm motion completes

2. **Sequential Commands**
   - Execute 5 commands in sequence
   - Verify smooth transitions
   - Check for state consistency

3. **Reset Functionality**
   - Execute motion
   - Click reset
   - Verify character returns to T-pose

### Automated Testing (Future)

Create tests with Playwright/Cypress:

```typescript
// Example test
describe('Motion Generation', () => {
  it('should generate motion for valid command', async () => {
    await page.goto('http://localhost:3000');
    await page.fill('input', 'wave right hand');
    await page.click('button[type="submit"]');

    // Wait for motion to complete
    await page.waitForTimeout(2000);

    // Verify no errors
    const errors = await page.$$('.error');
    expect(errors).toHaveLength(0);
  });
});
```

### Debugging

Enable debug mode by adding to browser console:

```javascript
// Log all motions
window.addEventListener('motion', (e) => {
  console.log('Motion:', e.detail);
});

// Monitor FPS
let lastTime = performance.now();
function checkFPS() {
  const now = performance.now();
  const fps = 1000 / (now - lastTime);
  console.log('FPS:', fps.toFixed(1));
  lastTime = now;
  requestAnimationFrame(checkFPS);
}
checkFPS();
```

### Known Issues & Workarounds

1. **Model Loading Slow**
   - Reduce model size
   - Use compressed textures
   - Implement loading screen

2. **Motion Jitter**
   - Increase easing duration
   - Reduce FPS target
   - Check CPU usage

3. **API Timeout**
   - Increase Vercel function timeout
   - Add retry logic
   - Cache common motions

### Test Report Template

```markdown
## Test Report - [Date]

### Environment
- Browser: [name + version]
- Device: [model]
- Model: [VRM file name]
- Deployment: [local/vercel/production]

### Test Results

| Command | Status | Notes |
|---------|--------|-------|
| wave right hand | ✅ | Smooth, 45 FPS |
| look left | ✅ | Good easing |
| ... | ... | ... |

### Issues Found
1. [Description]
   - Severity: [Low/Medium/High]
   - Steps to reproduce
   - Expected vs Actual

### Performance Metrics
- Avg FPS: [number]
- Avg Latency: [ms]
- API Success Rate: [%]

### Recommendations
- [Improvement suggestions]
```

## Quality Assurance Checklist

Before marking release as ready:

- [ ] All basic motions work correctly
- [ ] No console errors
- [ ] Performance meets targets (30+ FPS, <500ms latency)
- [ ] Safety constraints enforced
- [ ] Works on all major browsers
- [ ] Mobile responsive
- [ ] API handles errors gracefully
- [ ] Documentation is complete
- [ ] Environment variables documented
- [ ] Deployment successful
