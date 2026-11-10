import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, type CompetitorDTO, type FighterDetailsDTO } from '../api/client'
import { useSeasonTheme } from '../theme'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function FighterDetails({ fighter, onClose }: { fighter: CompetitorDTO; onClose: () => void }) {
  const { theme } = useSeasonTheme()
  const { palette, spacing } = theme
  const [details, setDetails] = useState<FighterDetailsDTO>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    void api.getFighter(fighter.id).then((response) => {
      if (active) setDetails(response)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar o perfil.')
    })
    return () => { active = false }
  }, [fighter.id])

  const text = { color: palette.text }
  const muted = { color: palette.textMuted }
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.screen, { backgroundColor: palette.background, padding: spacing(2) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, text]}>{fighter.name}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
            <Text style={{ color: palette.primary }}>Fechar</Text>
          </Pressable>
        </View>
        {error ? <Text style={text}>{error}</Text> : details ? (
          <ScrollView contentContainerStyle={{ gap: spacing(1), paddingVertical: spacing(2) }}>
            <Text style={muted}>{details.team} · {details.spec.weight} · {details.spec.style}</Text>
            <Text style={muted}>Fonte ESPN</Text>
            <Text style={[styles.heading, text]}>Estatísticas</Text>
            {details.statistics.summary.length === 0 && details.statistics.categories.length === 0 &&
              <Text style={muted}>Sem estatísticas publicadas.</Text>}
            {details.statistics.summary.map((stat) => (
              <Text style={text} key={stat.name}>{stat.displayName} · {stat.displayValue}</Text>
            ))}
            {details.statistics.categories.map((category) => (
              <View key={category.displayName}>
                <Text style={muted}>{category.displayName}</Text>
                {category.stats.map((stat) => (
                  <Text style={text} key={stat.name}>{stat.displayName} · {stat.displayValue}</Text>
                ))}
              </View>
            ))}
            <Text style={[styles.heading, text]}>Próximas lutas</Text>
            {details.upcomingFights.length === 0 && <Text style={muted}>Sem luta anunciada no card.</Text>}
            {details.upcomingFights.map((fight) => (
              <View key={fight.id}>
                <Text style={text}>{fight.competitorA.name} vs. {fight.competitorB.name}</Text>
                <Text style={muted}>{formatDate(fight.scheduledAt)} · {fight.eventName}</Text>
              </View>
            ))}
            <Text style={[styles.heading, text]}>Histórico</Text>
            {details.history.length === 0 && <Text style={muted}>Sem lutas no histórico publicado.</Text>}
            {details.history.map((fight) => (
              <View key={fight.id}>
                <Text style={text}>{fight.opponent?.name ?? fight.eventName} · {fight.result ?? '—'}</Text>
                <Text style={muted}>{formatDate(fight.date)} · {fight.eventName}{fight.method ? ` · ${fight.method}` : ''}</Text>
              </View>
            ))}
          </ScrollView>
        ) : <ActivityIndicator color={palette.primary} />}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', flex: 1 },
  heading: { fontSize: 17, fontWeight: '700', marginTop: 8 },
})
