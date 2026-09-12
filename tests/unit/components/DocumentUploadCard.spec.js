import { shallowMount } from '@vue/test-utils'
import DocumentUploadCard from '@/components/onboarding/DocumentUploadCard.vue'

const original = { document_type: 'driving_license', upload_status: 'uploaded', file_name: 'old.pdf' }
function mountCard(props = {}) {
  return shallowMount(DocumentUploadCard, {
    props: { document: original, disabled: false, isUploading: false, ...props },
    global: { stubs: { AppButton: false, 'v-file-input': true } }
  })
}
const button = (wrapper, label) => wrapper.findAll('button').find(b => b.text() === label)

describe('DocumentUploadCard replacement', () => {
  it('opens an editor for uploaded documents and closes only on confirmed new state', async () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('old.pdf')
    await button(wrapper, 'Replace document').trigger('click')
    expect(wrapper.find('v-file-input-stub').exists()).toBe(true)
    expect(button(wrapper, 'Upload').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ isUploading: true })
    await wrapper.setProps({ isUploading: false }) // failed attempt retains editor
    expect(wrapper.find('v-file-input-stub').exists()).toBe(true)
    await wrapper.setProps({ document: { ...original, file_name: 'new.pdf' } })
    expect(wrapper.find('v-file-input-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('new.pdf')
    wrapper.unmount()
  })

  it('cannot begin replacement while disabled or uploading', () => {
    for (const props of [{ disabled: true }, { isUploading: true }]) {
      const wrapper = mountCard(props)
      expect(button(wrapper, 'Replace document').attributes('disabled')).toBeDefined()
      wrapper.unmount()
    }
  })
})
