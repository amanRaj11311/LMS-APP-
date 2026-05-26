import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const TakeTestScreen = ({ route, navigation }: any) => {
  const { testData } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState((testData?.duration || 30) * 60);
  const [submitModal, setSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentIndex];
useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(timer);
        navigation.navigate('MainTabs', { screen: 'Tests' });
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, []);

  const calculateScoreAndSubmit = () => {
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      const studentAns = (answers[i] || '').trim().toLowerCase();
      const rightAns = (q.correctAnswer || '').trim().toLowerCase();
      if (studentAns === rightAns && studentAns !== '') {
        correct++;
      }
    });

    setScore(Math.round((correct / questions.length) * 100) || 0);
    setSubmitModal(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    const isPassed = score >= 40;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultCard}>
          <View style={[styles.successIcon, { backgroundColor: isPassed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
            <MaterialIcons name={isPassed ? 'check' : 'close'} size={30} color={isPassed ? '#10B981' : '#EF4444'} />
          </View>
          <Text style={styles.resultTitle}>Test Submitted!</Text>
          <Text style={[styles.scoreText, { color: isPassed ? '#10B981' : '#EF4444' }]}>{score}%</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statVal}>{questions.length}</Text><Text style={styles.statLabel}>Total</Text></View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155' }]}><Text style={styles.statVal}>{Object.keys(answers).length}</Text><Text style={styles.statLabel}>Answered</Text></View>
            <View style={styles.statBox}><Text style={styles.statVal}>{questions.length - Object.keys(answers).length}</Text><Text style={styles.statLabel}>Skipped</Text></View>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Tests' })}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Back to Main Tab</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{testData.title}</Text>
        <Text style={{ color: '#FFF' }}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
      </View>

      <ScrollView style={styles.mainArea}>
        <Text style={styles.questionText}>Q{currentIndex + 1}: {currentQuestion?.questionText}</Text>

        {/* MCQ Rendering */}
        {currentQuestion?.questionType === 'MCQ' &&
          currentQuestion?.options?.map((opt: string, i: number) => (
            <TouchableOpacity
              key={i}
              style={[styles.optionBtn, answers[currentIndex] === opt && styles.optionBtnSelected]}
              onPress={() => setAnswers({ ...answers, [currentIndex]: opt })}
            >
              <Text style={{ color: '#FFF' }}>{opt}</Text>
            </TouchableOpacity>
          ))}

        {/* True/False Rendering */}
        {currentQuestion?.questionType === 'TrueFalse' &&
          ['True', 'False'].map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.optionBtn, answers[currentIndex] === opt && styles.optionBtnSelected]}
              onPress={() => setAnswers({ ...answers, [currentIndex]: opt })}
            >
              <Text style={{ color: '#FFF' }}>{opt}</Text>
            </TouchableOpacity>
          ))}

        {/* Text Based Inputs for ALL other types (Short Answer, Fill in blanks, One word, SBQ) */}
        {(currentQuestion?.questionType === 'Short answer' || 
          currentQuestion?.questionType === 'Fill in the blanks' || 
          currentQuestion?.questionType === 'One Word answer' || 
          currentQuestion?.questionType === 'SBQ') && (
          <TextInput
            style={[styles.textInput, currentQuestion?.questionType === 'SBQ' && { height: 140 }]}
            multiline={currentQuestion?.questionType === 'Short Answer' || currentQuestion?.questionType === 'SBQ'}
            placeholder="Type your answer here..."
            placeholderTextColor="#94A3B8"
            value={answers[currentIndex] || ''}
            onChangeText={(text) => setAnswers({ ...answers, [currentIndex]: text })}
          />
        )}
      </ScrollView>

      <View style={styles.footerNav}>
      <TouchableOpacity
  disabled={currentIndex === 0}
  onPress={() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  }}
  style={[
    styles.navBtn,
    currentIndex === 0 && { opacity: 0.5 },
  ]}
>
  <Text style={styles.navBtnText}>Prev</Text>
</TouchableOpacity>
        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
  style={styles.submitBtn}
  onPress={() => setSubmitModal(true)}
>
  <Text style={{ color: '#FFF' }}>Submit</Text>
</TouchableOpacity>
        ) : (
         <TouchableOpacity
  style={styles.navBtn}
  onPress={() => {
    setCurrentIndex(prev => prev + 1);
  }}
>
  <Text style={styles.navBtnText}>Next</Text>
</TouchableOpacity>
        )}
      </View>

      <Modal visible={submitModal} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ color: '#FFF', marginBottom: 10 }}>Confirm Submission?</Text>
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setSubmitModal(false)}><Text style={{ color: '#94A3B8', marginRight: 20 }}>Continue</Text></TouchableOpacity>
              <TouchableOpacity onPress={calculateScoreAndSubmit}><Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>Yes, Submit</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B' },
  headerTitle: { color: '#FFF', fontWeight: 'bold' },
  mainArea: { flex: 1, padding: 20 },
  questionText: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  optionBtn: { padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  optionBtnSelected: { backgroundColor: '#3B82F6' },
  textInput: { borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 15, color: '#FFF', backgroundColor: '#1E293B', minHeight: 50, textAlignVertical: 'top' },
  footerNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#1E293B' },
  submitBtn: { backgroundColor: '#10B981', padding: 10, borderRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1E293B', padding: 30, borderRadius: 10, width: '80%' },
  resultCard: { padding: 30, alignItems: 'center', marginTop: 50 },
  successIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scoreText: { fontSize: 48, fontWeight: '900', marginVertical: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 8, paddingVertical: 15, width: '100%' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 10 },
  navBtnText: {
  color: '#FFF',
  fontWeight: 'bold',
},
  navBtn: {
  backgroundColor: '#334155',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 9,
},
  backBtn: { backgroundColor: '#4338CA', width: '100%', paddingVertical: 14, alignItems: 'center', borderRadius: 8, marginTop: 20 }
});

export default TakeTestScreen;