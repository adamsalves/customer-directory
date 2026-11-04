<script setup lang="ts">
import S from './CustomerAvatar.module.scss'

// `size` is the box the photo reserves before it arrives (its width and height attributes). How big
// the avatar is on screen is up to the parent, which sizes the root.
const props = withDefaults(
  defineProps<{
    src: string
    name: string
    alt: string
    size: number
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'high'
  }>(),
  { loading: 'lazy', fetchpriority: undefined },
)

// ponytail: the initials are hidden from assistive technology, which suits a decorative photo
// (alt="", the card) but leaves one with an alt unnamed once it fails (the detail of the prototype
// has one, "Foto de <name>"); give the root role="img" and the alt as its aria-label then.
const failed = ref(false)
const imageRef = useTemplateRef('image')

// "Maria da Cruz" -> "MC": the first letter of the first and of the last word, one letter for a
// name of one word
const initials = computed(() => {
  const [first = '', ...rest] = props.name.trim().split(/\s+/)
  return (first.charAt(0) + (rest.at(-1) ?? '').charAt(0)).toUpperCase()
})

// A photo that fails before the page hydrates fires its `error` where nothing listens yet. It is
// left complete and with no width; one still on its way is not complete.
onMounted(() => {
  const image = imageRef.value
  if (image?.complete && image.naturalWidth === 0) failed.value = true
})
</script>

<template>
  <span :class="S.Avatar" data-testid="customer-avatar__root--span">
    <img
      v-if="!failed"
      ref="image"
      :src="src"
      :alt="alt"
      :width="size"
      :height="size"
      decoding="async"
      :loading="loading"
      :fetchpriority="fetchpriority"
      :class="S.Image"
      data-testid="customer-avatar__photo--image"
      @error="failed = true"
    />
    <span
      v-else
      aria-hidden="true"
      :class="S.Initials"
      data-testid="customer-avatar__initials--text"
      >{{ initials }}</span
    >
  </span>
</template>
