import { Mic, PenLine, Target } from "lucide-react";
import { getState } from "@/lib/store";
import { PageHeader, SkillCard } from "@/components/ds";

export default function Skills() {
  const student = getState();

  return (
    <div className="page-container page-section">
      <PageHeader
        icon={Target}
        title="الْمَهَارَاتُ اللُّغَوِيَّةُ"
        description="اخْتَرِ الْمَهَارَةَ الَّتِي تُرِيدُ تَطْوِيرَهَا."
        back={{ label: "الرَّئِيسِيَّةُ", to: "/dashboard" }}
      />

      <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
        <SkillCard
          index={0} skill="speaking" icon={Mic} to="/skills/speaking"
          title="مَهَارَةُ التَّحَدُّثِ" description="تَعَلَّمِ التَّعْبِيرَ الشَّفَهِيَّ وَالتَّحَدُّثَ بِثِقَةٍ"
          tags={["وَصْفُ رِحْلَةٍ صَيْفِيَّةٍ", "قِرَاءَةٌ مَنْشُورٌ تَوْعَوِيٌّ", "التَّعْبِيرُ عَنِ الرَّأْيِ"]}
          progress={student.speakingProgress} cta={student.speakingProgress > 0 ? "تَابِعِ التَّدْرِيبَ" : "ابْدَأِ التَّدْرِيبَ"}
        />
        <SkillCard
          index={1} skill="writing" icon={PenLine} to="/skills/writing"
          title="مَهَارَةُ الْكِتَابَةِ" description="طَوِّرْ أُسْلُوبَكَ الْكِتَابِيَّ وَإِبْدَاعَكَ اللُّغَوِيَّ"
          tags={["وَصْفُ الْمَنْزِلِ", "وَصْفُ الْحَيِّ", "وَصْفُ الْمَسْجِدِ"]}
          progress={student.writingProgress} cta={student.writingProgress > 0 ? "تَابِعِ التَّدْرِيبَ" : "ابْدَأِ التَّدْرِيبَ"}
        />
        <SkillCard
          index={2} skill="learning" icon={Target} to="/skills/self-learning"
          title="مَهَارَةُ التَّعَلُّمِ الذَّاتِيِّ" description="اكْتَشِفْ وَتَعَلَّمْ بِاسْتِقْلَالِيَّةٍ وَإِبْدَاعٍ"
          tags={["تَقْيِيمُ الذَّاتِ", "الْبَحْثُ وَالِاسْتِكْشَافُ", "الْمَشَارِيعُ الإِبْدَاعِيَّةُ"]}
          progress={student.selfLearningProgress} cta={student.selfLearningProgress > 0 ? "تَابِعِ التَّدْرِيبَ" : "ابْدَأِ التَّدْرِيبَ"}
        />
      </div>
    </div>
  );
}
