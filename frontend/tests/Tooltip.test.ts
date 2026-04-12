import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import Tooltip from '@/components/Tooltip.vue'

describe('Tooltip', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra y oculta el contenido al entrar y salir con el ratón (Teleport a body)', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Tooltip, {
      props: { showDelayMs: 0, hideDelayMs: 0 },
      slots: {
        default: '<span class="trigger">Hover</span>',
        content: '<div class="tip-body">Detalle</div>',
      },
      attachTo: document.body,
    })
    expect(document.querySelector('.tip-body')).toBeNull()
    await wrapper.trigger('mouseenter', { clientX: 120, clientY: 80 })
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('.tip-body')).not.toBeNull()
    await wrapper.trigger('mouseleave')
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('.tip-body')).toBeNull()
    wrapper.unmount()
  })
})
