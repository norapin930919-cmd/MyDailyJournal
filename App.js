import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

const MOODS = [
  { emoji: "🥰", label: "幸福" },
  { emoji: "😊", label: "開心" },
  { emoji: "😆", label: "興奮" },
  { emoji: "😌", label: "平靜" },
  { emoji: "🥹", label: "感動" },
  { emoji: "😎", label: "有自信" },
  { emoji: "🤩", label: "期待" },
  { emoji: "😐", label: "普通" },
  { emoji: "😴", label: "疲累" },
  { emoji: "😵‍💫", label: "混亂" },
  { emoji: "😰", label: "焦慮" },
  { emoji: "😔", label: "低落" },
  { emoji: "😭", label: "難過" },
  { emoji: "😡", label: "生氣" },
  { emoji: "😤", label: "煩躁" },
  { emoji: "🥺", label: "委屈" },
  { emoji: "😶‍🌫️", label: "迷惘" },
  { emoji: "🫠", label: "無力" },
];

const emptyEntry = () => ({
  todos: [],
  diary: "",
  reading: "",
  inspiration: "",
  moods: {},
  completed: "",
  feedback: "",
});

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storageKeyFor(date) {
  return `daily-journal:${localDateKey(date)}`;
}

function displayDate(date) {
  const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return {
    main: `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`,
    week: week[date.getDay()],
  };
}

function previousDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function safeEntry(raw) {
  const base = emptyEntry();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    moods: raw.moods || (raw.mood ? { [raw.mood]: 1 } : {}),
    todos: Array.isArray(raw.todos) ? raw.todos : [],
  };
}

function topMoodText(moods = {}) {
  const sorted = Object.entries(moods).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return "今天還沒有記錄情緒";
  return sorted
    .slice(0, 4)
    .map(([m, c]) => `${m}${c > 1 ? ` ×${c}` : ""}`)
    .join("、");
}

function includesAny(text, words) {
  return words.some((w) => text.includes(w));
}

function generateDailyFeedback(entry) {
  const diary = (entry.diary || "").trim();
  if (!diary) {
    return "今天還沒有日記內容。等你寫下一些今天發生的事情、你的想法或心情後，我會依照內容幫你整理一段比較完整的每日評語。";
  }

  const positives = ["開心", "順利", "完成", "喜歡", "期待", "幸福", "好吃", "好玩", "進步", "成功", "放鬆", "感謝"];
  const negatives = ["累", "煩", "難過", "生氣", "焦慮", "壓力", "不爽", "失望", "擔心", "哭", "低落", "卡住"];
  const effort = ["努力", "讀書", "上課", "工作", "完成", "練習", "準備", "報告", "作業", "運動", "整理"];
  const people = ["朋友", "同學", "家人", "媽媽", "爸爸", "弟弟", "老師", "主管", "同事"];
  const reflection = ["覺得", "發現", "想", "希望", "應該", "下次", "明天", "以後", "原來"];

  const hasPos = includesAny(diary, positives);
  const hasNeg = includesAny(diary, negatives);
  const hasEffort = includesAny(diary, effort);
  const hasPeople = includesAny(diary, people);
  const hasReflection = includesAny(diary, reflection);

  let p1 = "";
  if (hasPos && hasNeg) {
    p1 = "從今天的紀錄看起來，你的一天不是只有單一情緒，而是同時有讓你覺得不錯的部分，也有一些讓你累、煩或需要消化的事情。這種混合的感受其實很常見，也代表你有把一天裡不同層次的經驗寫下來，而不是只用「今天好或不好」來概括。";
  } else if (hasNeg) {
    p1 = "今天的文字裡可以感覺到有一些消耗感，可能是事情不順、壓力比較大，或你對某些狀況還沒有完全整理好。至少你有把它寫出來，這會比讓那些感受一直停留在腦中更容易看清楚：究竟是事情本身很麻煩，還是你今天已經太累，所以任何小事都特別容易放大。";
  } else if (hasPos) {
    p1 = "今天的紀錄裡有不少正向的訊號，看得出來你有注意到讓自己開心、順利或有成就感的部分。把這些小事留下來很有價值，因為過一陣子回頭看時，你會更容易發現哪些人、事情或生活節奏是真的能讓你狀態變好。";
  } else {
    p1 = "今天的日記比較像是在忠實記錄一天的過程，情緒沒有特別往某一邊傾斜。這種平常的日子其實也很值得留下，因為真正構成生活的大多不是特別戲劇化的事件，而是這些看似普通、但會慢慢累積成習慣與節奏的日常。";
  }

  let p2 = "";
  if (hasEffort) {
    p2 += "另外，你今天有寫到一些需要投入心力的事情。比起只看最後有沒有完成，也可以注意自己是在哪個時間點最有效率、哪一種任務最容易拖延，這會讓日記不只是紀錄，也慢慢變成你了解自己做事模式的工具。";
  }
  if (hasPeople) {
    p2 += (p2 ? " " : "") + "今天的內容也牽涉到身邊的人，這表示人際互動對你的情緒或一天的感受有一定影響。之後如果類似情況反覆出現，可以留意：是跟某些人在一起時比較放鬆，還是某些互動特別容易讓你消耗。";
  }
  if (hasReflection) {
    p2 += (p2 ? " " : "") + "你也有出現一些反思或對下一步的想法，這是很好的訊號。日記如果能慢慢累積「發生了什麼 → 我怎麼感覺 → 我想怎麼調整」，會比單純記事更容易看見自己的變化。";
  }
  if (!p2) {
    p2 = "如果明天想讓這篇日記更有回顧價值，可以多補一個小問題：「今天哪一件事最影響我的心情？」或「如果今天可以重來一次，我最想改哪個地方？」不用每次都回答很完整，一兩句就足夠。";
  }

  const moodText = topMoodText(entry.moods);
  const completed = (entry.completed || "").trim();
  let p3 = `你今天記錄的情緒是「${moodText}」。`;
  if (completed) {
    p3 += "而且你有另外寫下完成事項，這很適合拿來平衡我們很容易只記得「還沒做完」的傾向。今天不管成果大小，都可以把已完成的事情當成一天真正有往前走過的證據。";
  } else {
    p3 += "晚上如果還有一點時間，可以在「今日完成事項」補上至少一件完成的小事，即使只是回完訊息、整理桌面、讀了幾頁書，也算。這會讓你在一天結束時比較容易看到自己其實做了不少事情。";
  }

  return `${p1}\n\n${p2}\n\n${p3}`;
}

async function generateWeeklySummary(selectedDate) {
  const start = startOfWeekMonday(selectedDate);
  const entries = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const raw = await AsyncStorage.getItem(storageKeyFor(date));
    let entry = emptyEntry();
    if (raw) {
      try { entry = safeEntry(JSON.parse(raw)); } catch {}
    }
    entries.push({ date, entry });
  }

  const daysWritten = entries.filter(({ entry }) => entry.diary.trim()).length;
  const allTodos = entries.flatMap(({ entry }) => entry.todos || []);
  const doneTodos = allTodos.filter((t) => t.done).length;
  const completionRate = allTodos.length ? Math.round((doneTodos / allTodos.length) * 100) : 0;

  const moodTotals = {};
  entries.forEach(({ entry }) => {
    Object.entries(entry.moods || {}).forEach(([m, c]) => {
      moodTotals[m] = (moodTotals[m] || 0) + c;
    });
  });
  const moodRank = Object.entries(moodTotals).sort((a, b) => b[1] - a[1]);
  const moodSummary = moodRank.length
    ? moodRank.slice(0, 5).map(([m, c]) => `${m} ×${c}`).join("、")
    : "本週尚未記錄情緒";

  const completedTexts = entries
    .map(({ entry }) => entry.completed.trim())
    .filter(Boolean);
  const readingTexts = entries
    .map(({ entry }) => entry.reading.trim())
    .filter(Boolean);
  const inspirationTexts = entries
    .map(({ entry }) => entry.inspiration.trim())
    .filter(Boolean);

  const diaryText = entries.map(({ entry }) => entry.diary).join(" ");
  const positive = includesAny(diaryText, ["開心","順利","完成","期待","幸福","成功","喜歡","放鬆"]);
  const negative = includesAny(diaryText, ["累","煩","焦慮","難過","生氣","壓力","低落","擔心"]);

  let tone = "這週的紀錄整體比較平穩，沒有特別明顯地往正向或負向傾斜。";
  if (positive && negative) tone = "這週的狀態有明顯起伏，好的事情和讓你消耗的事情都有出現，整體比較像是一週中不斷調整與切換的節奏。";
  else if (positive) tone = "這週的文字裡正向感受比較多，代表這幾天有一些讓你滿意、期待或有成就感的事情。";
  else if (negative) tone = "這週的文字裡疲累、壓力或負面感受比較明顯，可能代表這幾天累積的事情比較多，需要留意休息與負荷。";

  const first = `${start.getMonth()+1}/${start.getDate()}`;
  const end = addDays(start, 6);
  const last = `${end.getMonth()+1}/${end.getDate()}`;

  let summary = `【${first}－${last} 每週總結】\n\n`;
  summary += `${tone} 這週你有 ${daysWritten} 天寫下日記；`;
  if (allTodos.length) {
    summary += `一共記錄 ${allTodos.length} 項待辦，完成 ${doneTodos} 項，完成率約 ${completionRate}%。`;
  } else {
    summary += "這週還沒有記錄待辦事項。";
  }

  summary += `\n\n本週最常出現的情緒：${moodSummary}。`;
  if (moodRank.length >= 2) {
    summary += " 從情緒分布來看，比起只用「好或不好」形容這一週，你其實經歷了不少不同狀態。這種紀錄累積幾週後，會很容易看出自己在哪些日子特別容易疲累、焦慮，或什麼情況下比較開心。";
  }

  if (completedTexts.length) {
    summary += `\n\n你有 ${completedTexts.length} 天記錄完成事項。這代表這週不只是忙，而是真的有留下成果。回顧時可以特別看哪些事情雖然當下覺得很小，但其實對後續進度最有幫助。`;
  }

  if (readingTexts.length) {
    summary += `\n\n閱讀方面，你有 ${readingTexts.length} 天留下紀錄。與其只追求讀了多少，更值得觀察的是哪些內容真的讓你產生想法、改變觀點，或在幾天後還記得。`;
  }

  if (inspirationTexts.length) {
    summary += `\n\n這週也有 ${inspirationTexts.length} 天留下靈感。建議週末回頭挑一個最想實際去做的想法，不然靈感很容易只停在「當下覺得不錯」，卻沒有真正變成行動。`;
  }

  summary += "\n\n下週可以只設定一個最重要的重點：不要一次要求自己全部變好，而是挑一件你希望更穩定的事情，例如早點完成待辦、每天留一點閱讀時間，或在情緒很累時提早停下來休息。連續幾週後，再回頭看每週總結，你會更容易看見自己的生活節奏到底怎麼變化。";

  return summary;
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entry, setEntry] = useState(emptyEntry());
  const [newTodo, setNewTodo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState("");
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const storageKey = useMemo(
    () => storageKeyFor(selectedDate),
    [selectedDate]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoaded(false);
      try {
        let current = emptyEntry();
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          try { current = safeEntry(JSON.parse(raw)); } catch {}
        }

        // 自動帶入前一天未完成待辦
        const prevDate = previousDay(selectedDate);
        const prevRaw = await AsyncStorage.getItem(storageKeyFor(prevDate));
        if (prevRaw) {
          try {
            const prev = safeEntry(JSON.parse(prevRaw));
            const unfinished = (prev.todos || []).filter((t) => !t.done);
            const existingIds = new Set((current.todos || []).map((t) => t.carryKey).filter(Boolean));
            const carried = unfinished
              .map((t) => ({
                id: `carry-${localDateKey(prevDate)}-${t.id}`,
                text: t.text,
                done: false,
                carried: true,
                carryKey: `${localDateKey(prevDate)}-${t.id}`,
              }))
              .filter((t) => !existingIds.has(t.carryKey));

            if (carried.length) {
              current = { ...current, todos: [...carried, ...(current.todos || [])] };
            }
          } catch {}
        }

        if (!active) return;
        setEntry(current);
      } catch {
        if (active) setEntry(emptyEntry());
      } finally {
        if (active) setLoaded(true);
      }
    }
    load();
    return () => { active = false; };
  }, [storageKey, selectedDate]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    }, 180);
    return () => clearTimeout(timer);
  }, [entry, storageKey, loaded]);

  useEffect(() => {
    generateWeeklySummary(selectedDate).then(setWeeklySummary);
  }, [selectedDate, entry]);

  function changeDay(amount) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + amount);
    setSelectedDate(next);
  }

  function goToday() {
    setSelectedDate(new Date());
  }

  function updateField(field, value) {
    setEntry((prev) => ({ ...prev, [field]: value }));
  }

  function addTodo() {
    const text = newTodo.trim();
    if (!text) return;
    setEntry((prev) => ({
      ...prev,
      todos: [...prev.todos, { id: `${Date.now()}-${Math.random()}`, text, done: false }],
    }));
    setNewTodo("");
  }

  function toggleTodo(id) {
    setEntry((prev) => ({
      ...prev,
      todos: prev.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    }));
  }

  function deleteTodo(id) {
    setEntry((prev) => ({
      ...prev,
      todos: prev.todos.filter((todo) => todo.id !== id),
    }));
  }

  function addMood(label) {
    setEntry((prev) => ({
      ...prev,
      moods: {
        ...(prev.moods || {}),
        [label]: ((prev.moods || {})[label] || 0) + 1,
      },
    }));
  }

  function removeMood(label) {
    setEntry((prev) => {
      const moods = { ...(prev.moods || {}) };
      const next = (moods[label] || 0) - 1;
      if (next <= 0) delete moods[label];
      else moods[label] = next;
      return { ...prev, moods };
    });
  }

  function refreshFeedback() {
    const feedback = generateDailyFeedback(entry);
    setEntry((prev) => ({ ...prev, feedback }));
  }

  async function refreshWeekly() {
    setWeeklyLoading(true);
    const result = await generateWeeklySummary(selectedDate);
    setWeeklySummary(result);
    setWeeklyLoading(false);
  }

  const dateText = displayDate(selectedDate);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.appTitle}>☕ 我的每日手帳</Text>

          <View style={styles.card}>
            <Text style={styles.dateTitle}>{dateText.main}</Text>
            <Text style={styles.weekday}>{dateText.week}</Text>
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navButton} onPress={() => changeDay(-1)}>
                <Text style={styles.navButtonText}>← 前一天</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.todayButton} onPress={goToday}>
                <Text style={styles.todayButtonText}>今天</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => changeDay(1)}>
                <Text style={styles.navButtonText}>後一天 →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>✓ 今日代辦事項</Text>
            <Text style={styles.helperText}>前一天沒完成的事情，會自動帶到今天。</Text>
            <View style={styles.todoInputRow}>
              <TextInput
                value={newTodo}
                onChangeText={setNewTodo}
                onSubmitEditing={addTodo}
                placeholder="新增今天要做的事情…"
                placeholderTextColor="#9b9189"
                style={styles.todoInput}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addButton} onPress={addTodo}>
                <Text style={styles.addButtonText}>新增</Text>
              </TouchableOpacity>
            </View>

            {entry.todos.length === 0 ? (
              <Text style={styles.emptyText}>今天還沒有代辦事項</Text>
            ) : (
              entry.todos.map((todo) => (
                <View key={todo.id} style={styles.todoRow}>
                  <TouchableOpacity onPress={() => toggleTodo(todo.id)} style={styles.checkButton}>
                    <Text style={styles.checkText}>{todo.done ? "✓" : "○"}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.todoText, todo.done && styles.todoDone]}>{todo.text}</Text>
                    {todo.carried && <Text style={styles.carriedText}>↳ 昨日未完成</Text>}
                  </View>
                  <TouchableOpacity onPress={() => deleteTodo(todo.id)}>
                    <Text style={styles.deleteText}>刪除</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>☁ 今日情緒</Text>
            <Text style={styles.helperText}>可以多選；同一個情緒可重複點選。長按可以減少一次。</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((mood) => {
                const count = (entry.moods || {})[mood.label] || 0;
                return (
                  <TouchableOpacity
                    key={mood.label}
                    style={[styles.moodButton, count > 0 && styles.moodSelected]}
                    onPress={() => addMood(mood.label)}
                    onLongPress={() => removeMood(mood.label)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                    {count > 0 && <Text style={styles.moodCount}>×{count}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.moodSummary}>今日：{topMoodText(entry.moods)}</Text>
          </View>

          <JournalTextCard
            title="✎ 日記"
            placeholder="今天發生了什麼？寫下來吧…"
            value={entry.diary}
            onChangeText={(text) => updateField("diary", text)}
            height={190}
          />

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitleNoMargin}>💬 今日評語</Text>
              <TouchableOpacity style={styles.smallButton} onPress={refreshFeedback}>
                <Text style={styles.smallButtonText}>產生評語</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>評語會依照你今天寫的內容、情緒與完成事項整理。</Text>
            <Text style={styles.feedbackText}>
              {entry.feedback || "寫完日記後按「產生評語」，這裡會出現今天的回顧與建議。"}
            </Text>
          </View>

          <JournalTextCard
            title="☷ 今日閱讀"
            placeholder="書名、文章、閱讀進度或心得…"
            value={entry.reading}
            onChangeText={(text) => updateField("reading", text)}
          />

          <JournalTextCard
            title="✦ 今日靈感"
            placeholder="記下突然出現的想法與靈感…"
            value={entry.inspiration}
            onChangeText={(text) => updateField("inspiration", text)}
          />

          <JournalTextCard
            title="★ 今日完成事項"
            placeholder="今天完成了哪些事情？"
            value={entry.completed}
            onChangeText={(text) => updateField("completed", text)}
          />

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitleNoMargin}>📊 每週總結</Text>
              <TouchableOpacity style={styles.smallButton} onPress={refreshWeekly}>
                <Text style={styles.smallButtonText}>{weeklyLoading ? "整理中…" : "重新整理"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>以星期一到星期日為一週，整理日記、情緒、待辦完成率、閱讀與靈感。</Text>
            <Text style={styles.feedbackText}>{weeklySummary || "本週資料整理中…"}</Text>
          </View>

          <Text style={styles.saveNote}>內容會自動儲存在這支手機裡。</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function JournalTextCard({ title, placeholder, value, onChangeText, height = 125 }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9b9189"
        textAlignVertical="top"
        style={[styles.textArea, { minHeight: height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#F7F3ED" },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  appTitle: { fontSize: 22, fontWeight: "700", color: "#3D3935", textAlign: "center", marginBottom: 14 },
  card: { backgroundColor: "#FFFDF9", borderRadius: 20, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: "#E9E0D7" },
  dateTitle: { fontSize: 24, fontWeight: "700", color: "#3D3935", textAlign: "center" },
  weekday: { fontSize: 14, color: "#8A8178", textAlign: "center", marginTop: 5, marginBottom: 15 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 7 },
  navButton: { flex: 1, borderWidth: 1, borderColor: "#E5DAD0", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  navButtonText: { color: "#615951", fontSize: 13, fontWeight: "600" },
  todayButton: { borderRadius: 12, backgroundColor: "#C99F8C", paddingVertical: 10, paddingHorizontal: 16 },
  todayButtonText: { color: "#FFFFFF", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#3D3935", marginBottom: 12 },
  sectionTitleNoMargin: { fontSize: 18, fontWeight: "700", color: "#3D3935" },
  helperText: { color: "#8A8178", fontSize: 12, lineHeight: 18, marginBottom: 11 },
  todoInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  todoInput: { flex: 1, backgroundColor: "#F8F4EF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: "#3D3935" },
  addButton: { backgroundColor: "#C99F8C", borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  addButtonText: { color: "#FFFFFF", fontWeight: "700" },
  emptyText: { color: "#9B9189", textAlign: "center", paddingVertical: 10 },
  todoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E9E0D7" },
  checkButton: { width: 34 },
  checkText: { fontSize: 22, color: "#A37D6E" },
  todoText: { color: "#3D3935", fontSize: 15 },
  todoDone: { color: "#9B9189", textDecorationLine: "line-through" },
  carriedText: { color: "#AE8D7D", fontSize: 11, marginTop: 2 },
  deleteText: { color: "#A87970", fontSize: 13, paddingLeft: 8 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodButton: { width: "31%", backgroundColor: "#F8F4EF", borderRadius: 14, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "transparent", position: "relative" },
  moodSelected: { backgroundColor: "#F2E3DB", borderColor: "#C99F8C" },
  moodEmoji: { fontSize: 28, marginBottom: 3 },
  moodLabel: { fontSize: 12, color: "#615951" },
  moodCount: { position: "absolute", right: 8, top: 7, fontSize: 11, fontWeight: "700", color: "#9A6F5D" },
  moodSummary: { marginTop: 12, color: "#765F54", fontSize: 13, lineHeight: 19 },
  textArea: { backgroundColor: "#F8F4EF", borderRadius: 14, padding: 13, fontSize: 15, color: "#3D3935", lineHeight: 23 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  smallButton: { backgroundColor: "#EEDDD4", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: "#775C50", fontSize: 12, fontWeight: "700" },
  feedbackText: { color: "#4B4540", fontSize: 14, lineHeight: 24 },
  saveNote: { color: "#8A8178", fontSize: 12, textAlign: "center", marginTop: 4 },
});
