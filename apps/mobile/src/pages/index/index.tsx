import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'

export default function Index() {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className="flex h-screen items-center justify-center bg-pink-50">
      <View className="flex flex-col items-center gap-4 p-8">
        <Text className="text-4xl font-bold text-pink-600">momoya</Text>
        <Text className="text-sm text-pink-400">M1 Tailwind ready</Text>
      </View>
    </View>
  )
}
