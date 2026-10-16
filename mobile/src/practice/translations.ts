// Sentence translation questions in the style of the YDS translation section.
// The wrong options change the meaning the way exam distractors do: a different conjunction,
// tense, or who does what.
export type TranslationItem = {
  id: string;
  direction: 'en-tr' | 'tr-en';
  sentence: string;
  correct: string;
  wrong: [string, string, string];
  // Why the correct option is right and the others are not; shown after a wrong answer.
  explanation: string;
};

export const TRANSLATIONS: TranslationItem[] = [
  {
    id: 'en-tr-01',
    direction: 'en-tr',
    sentence: 'Although the government has taken several measures, unemployment continues to rise.',
    correct: 'Hükümet birkaç önlem almış olsa da işsizlik artmaya devam ediyor.',
    wrong: [
      'Hükümet birkaç önlem aldığı için işsizlik artmaya devam ediyor.',
      'Hükümet birkaç önlem almadıkça işsizlik artmaya devam edecek.',
      'İşsizlik artmaya devam ettiği için hükümet birkaç önlem aldı.',
    ],
    explanation:
      '“Although” = -sa da / -e rağmen: önlem alınmış ama işsizlik yine artıyor. “Aldığı için” (sebep), “almadıkça” (koşul) ve sebep-sonucu ters çeviren şık cümlenin anlamını değiştiriyor.',
  },
  {
    id: 'en-tr-02',
    direction: 'en-tr',
    sentence: 'The researchers found that regular exercise significantly reduces the risk of heart disease.',
    correct: 'Araştırmacılar, düzenli egzersizin kalp hastalığı riskini önemli ölçüde azalttığını buldu.',
    wrong: [
      'Araştırmacılar, düzenli egzersizin kalp hastalığı riskini önemli ölçüde azaltabileceğini düşünüyor.',
      'Araştırmacılar, kalp hastalığı riskini azaltmak için düzenli egzersiz yapılmasını önerdi.',
      'Araştırmacılara göre kalp hastalığı riski, düzenli egzersiz yapmayanlarda önemli ölçüde artıyor.',
    ],
    explanation:
      '“found that … reduces” = azalttığını buldu (kesin bir bulgu). “Azaltabileceğini düşünüyor” tahmindir, “önerdi” tavsiyedir, son şık ise egzersiz yapmayanlardan söz ediyor.',
  },
  {
    id: 'en-tr-03',
    direction: 'en-tr',
    sentence: 'Unless urgent action is taken, many species will disappear within the next century.',
    correct: 'Acil önlem alınmazsa, birçok tür gelecek yüzyıl içinde yok olacak.',
    wrong: [
      'Acil önlem alındığı için birçok tür gelecek yüzyıla kadar yok olmayacak.',
      'Acil önlem alınsa bile birçok tür gelecek yüzyıl içinde yok olacak.',
      'Birçok tür geçen yüzyılda yok olduğu için acil önlem alınması gerekiyor.',
    ],
    explanation:
      '“Unless” = -mezse, -medikçe: önlem alınmazsa türler yok olacak. “Alındığı için” ve “alınsa bile” koşulu bozuyor; son şık geçmiş zamandan söz ediyor.',
  },
  {
    id: 'en-tr-04',
    direction: 'en-tr',
    sentence: 'The novel, which was written in the nineteenth century, is still widely read today.',
    correct: 'On dokuzuncu yüzyılda yazılmış olan roman bugün hâlâ yaygın olarak okunuyor.',
    wrong: [
      'Roman on dokuzuncu yüzyılda yazılmış olmasına rağmen bugün pek okunmuyor.',
      'On dokuzuncu yüzyılda yaygın olarak okunan roman bugün yeniden yazılıyor.',
      'Bugün yaygın olarak okunan romanların çoğu on dokuzuncu yüzyılda yazılmıştır.',
    ],
    explanation:
      '“which was written … is still widely read” = yazılmış olan roman hâlâ yaygın okunuyor. Diğer şıklar “pek okunmuyor”, “yeniden yazılıyor” ya da genel bir romanlar ifadesiyle anlamı değiştiriyor.',
  },
  {
    id: 'en-tr-05',
    direction: 'en-tr',
    sentence: 'Not only did the company increase its profits, but it also expanded into new markets.',
    correct: 'Şirket yalnızca kârını artırmakla kalmadı, aynı zamanda yeni pazarlara da açıldı.',
    wrong: [
      'Şirket kârını artırmak için yeni pazarlara açılmak zorunda kaldı.',
      'Şirket yeni pazarlara açıldığı hâlde kârını artıramadı.',
      'Şirket ya kârını artıracak ya da yeni pazarlara açılacak.',
    ],
    explanation:
      '“Not only … but also” = yalnızca … değil, aynı zamanda … da: iki olumlu sonuç birlikte. Diğer şıklar amaç (“için”), zıtlık (“hâlde … artıramadı”) ya da seçenek (“ya … ya da”) kuruyor.',
  },
  {
    id: 'en-tr-06',
    direction: 'en-tr',
    sentence: 'It is widely believed that learning a foreign language at an early age is easier.',
    correct: 'Erken yaşta yabancı dil öğrenmenin daha kolay olduğuna yaygın olarak inanılır.',
    wrong: [
      'Erken yaşta yabancı dil öğrenenlerin daha başarılı olduğu kanıtlanmıştır.',
      'Yabancı dil öğrenmenin erken yaşta daha zor olduğuna yaygın olarak inanılır.',
      'Çoğu kişi yabancı dili erken yaşta öğrenmenin gerekli olduğuna inanıyor.',
    ],
    explanation:
      '“It is widely believed that …” = …e yaygın olarak inanılır; inanılan şey “daha kolay olduğu”. “Kanıtlanmıştır” inanç değil kanıttır, “daha zor” anlamı tersine çevirir, “gerekli” başka bir yargıdır.',
  },
  {
    id: 'en-tr-07',
    direction: 'en-tr',
    sentence: 'Had the warning been taken seriously, the accident could have been prevented.',
    correct: 'Uyarı ciddiye alınmış olsaydı, kaza önlenebilirdi.',
    wrong: [
      'Uyarı ciddiye alındığı için kaza önlendi.',
      'Uyarı ciddiye alınırsa kaza önlenebilir.',
      'Kaza önlenemediği için uyarı ciddiye alınmaya başlandı.',
    ],
    explanation:
      '“Had the warning been taken …” = If the warning had been taken: geçmişe dönük gerçekleşmemiş koşul → “alınmış olsaydı, önlenebilirdi”. Diğer şıklar kazanın önlendiğini, gelecekteki bir koşulu ya da ters bir sebep-sonucu anlatıyor.',
  },
  {
    id: 'en-tr-08',
    direction: 'en-tr',
    sentence: 'The more people rely on technology, the less they tend to use their memory.',
    correct: 'İnsanlar teknolojiye ne kadar çok güvenirse, hafızalarını o kadar az kullanma eğiliminde olurlar.',
    wrong: [
      'İnsanlar teknolojiye güvendikleri için hafızalarını daha çok kullanırlar.',
      'İnsanlar hafızalarını ne kadar az kullanırsa, teknolojiye o kadar az güvenirler.',
      'Teknolojiye güvenen insanların çoğu hafızasını hiç kullanmaz.',
    ],
    explanation:
      '“The more …, the less …” = ne kadar çok …, o kadar az …: iki şey ters orantılı. Diğer şıklar orantıyı ya kaldırıyor ya ters çeviriyor ya da “hiç kullanmaz” gibi aşırı bir genelleme yapıyor.',
  },
  {
    id: 'en-tr-09',
    direction: 'en-tr',
    sentence: 'Despite its small size, the country plays an important role in international trade.',
    correct: 'Küçük boyutuna rağmen ülke, uluslararası ticarette önemli bir rol oynuyor.',
    wrong: [
      'Ülke küçük olduğu için uluslararası ticarette önemli bir rol oynayamıyor.',
      'Ülke, uluslararası ticarette önemli bir rol oynadığı için küçük sayılmaz.',
      'Küçük ülkelerin uluslararası ticarette önemli bir rol oynaması beklenmez.',
    ],
    explanation:
      '“Despite its small size” = küçük boyutuna rağmen: küçüklüğe rağmen önemli rol. “Küçük olduğu için … oynayamıyor” anlamı tersine çevirir; diğer iki şık ilişkiyi ve öznesini değiştiriyor.',
  },
  {
    id: 'en-tr-10',
    direction: 'en-tr',
    sentence: 'Scientists are trying to determine whether the new drug has any long-term side effects.',
    correct: 'Bilim insanları, yeni ilacın uzun vadeli herhangi bir yan etkisinin olup olmadığını belirlemeye çalışıyor.',
    wrong: [
      'Bilim insanları, yeni ilacın uzun vadeli yan etkilerinin olmadığını belirledi.',
      'Bilim insanları, yeni ilacın uzun vadeli yan etkilerini azaltmaya çalışıyor.',
      'Bilim insanları, yeni ilacın yan etkilerinin uzun vadede ortaya çıkacağını düşünüyor.',
    ],
    explanation:
      '“are trying to determine whether …” = …ıp olmadığını belirlemeye çalışıyor: henüz bilinmiyor. “Olmadığını belirledi” sonuca ulaşmış, “azaltmaya çalışıyor” başka bir eylem, “ortaya çıkacağını düşünüyor” bir tahmindir.',
  },
  {
    id: 'tr-en-01',
    direction: 'tr-en',
    sentence: 'Küresel ısınma, yalnızca çevreyi değil ekonomiyi de tehdit ediyor.',
    correct: 'Global warming threatens not only the environment but also the economy.',
    wrong: [
      'Global warming threatens the environment rather than the economy.',
      'Global warming is a threat to the economy because of the environment.',
      'Neither the environment nor the economy is threatened by global warming.',
    ],
    explanation:
      '“yalnızca … değil … de” = not only … but also. “rather than” (… yerine) birini dışlar, “because of” sebep kurar, “neither … nor” ise ikisini de olumsuzlar.',
  },
  {
    id: 'tr-en-02',
    direction: 'tr-en',
    sentence: 'Toplantı ertelenmeseydi, raporu zamanında bitiremezdik.',
    correct: 'If the meeting had not been postponed, we could not have finished the report on time.',
    wrong: [
      'Because the meeting was postponed, we could not finish the report on time.',
      'If the meeting is not postponed, we will not be able to finish the report on time.',
      'Although the meeting was postponed, we finished the report on time.',
    ],
    explanation:
      '“Ertelenmeseydi, bitiremezdik” geçmişe dönük gerçekleşmemiş koşul: If + had not been postponed, could not have finished. Diğer şıklar sebep (because), gelecek koşul (if … is) ya da zıtlık (although) kuruyor.',
  },
  {
    id: 'tr-en-03',
    direction: 'tr-en',
    sentence: 'Bu ilacın çocuklar üzerindeki etkileri henüz tam olarak bilinmiyor.',
    correct: 'The effects of this drug on children are not yet fully known.',
    wrong: [
      'The effects of this drug on children have never been studied.',
      'This drug is known to have no effect on children.',
      'Children are not yet fully aware of the effects of this drug.',
    ],
    explanation:
      '“henüz tam olarak bilinmiyor” = are not yet fully known. “Hiç incelenmedi”, “etkisi olmadığı biliniyor” ve “çocuklar farkında değil” cümlenin anlamını değiştiriyor.',
  },
  {
    id: 'tr-en-04',
    direction: 'tr-en',
    sentence: 'Şehirde yaşayanların sayısı arttıkça konut sorunu daha da ciddileşiyor.',
    correct: 'As the number of people living in cities increases, the housing problem becomes even more serious.',
    wrong: [
      'Since the housing problem is serious, the number of people living in cities is decreasing.',
      'The housing problem will become serious unless the number of people living in cities increases.',
      'The number of people living in cities increased after the housing problem became serious.',
    ],
    explanation:
      '“… arttıkça … ciddileşiyor” = As … increases, … becomes more serious (birlikte değişim). Diğer şıklar sebep-sonucu ters çeviriyor, koşul (unless) kuruyor ya da olayları sıraya koyuyor.',
  },
  {
    id: 'tr-en-05',
    direction: 'tr-en',
    sentence: 'Yazar, son kitabında göçün toplum üzerindeki etkilerini inceliyor.',
    correct: 'In his latest book, the author examines the effects of migration on society.',
    wrong: [
      'In his latest book, the author describes how society caused migration.',
      "The author's latest book was affected by migration in society.",
      'In his first book, the author examined the effects of society on migration.',
    ],
    explanation:
      '“son kitabında … etkilerini inceliyor” = In his latest book, the author examines the effects … . Diğer şıklar ilişkiyi tersine çeviriyor, kitabın etkilendiğini söylüyor ya da “ilk kitabı” diyor.',
  },
  {
    id: 'tr-en-06',
    direction: 'tr-en',
    sentence: 'Yeterli kanıt bulunmadığı için dava düştü.',
    correct: 'The case was dropped because there was not sufficient evidence.',
    wrong: [
      'The case was dropped although there was sufficient evidence.',
      'The case will be dropped unless sufficient evidence is found.',
      'Sufficient evidence was found after the case was dropped.',
    ],
    explanation:
      '“bulunmadığı için” = because there was not: sebep. “although” zıtlık, “unless” koşul, son şık ise olayların sırasını değiştiriyor.',
  },
  {
    id: 'tr-en-07',
    direction: 'tr-en',
    sentence: 'Öğrencilerin çoğu, sınavın beklediklerinden daha zor olduğunu söyledi.',
    correct: 'Most of the students said that the exam was more difficult than they had expected.',
    wrong: [
      'Most of the students expected the exam to be more difficult than it was.',
      'Few of the students said that the exam was as difficult as they had expected.',
      'Most of the students said that the exam would be more difficult next time.',
    ],
    explanation:
      '“beklediklerinden daha zor olduğunu söyledi” = said that the exam was more difficult than they had expected. Diğer şıklar karşılaştırmayı ters çeviriyor, “az öğrenci” diyor ya da geleceğe kayıyor.',
  },
  {
    id: 'tr-en-08',
    direction: 'tr-en',
    sentence: 'Bu köprü, Roma döneminde inşa edilmiş en eski yapılardan biridir.',
    correct: 'This bridge is one of the oldest structures built in the Roman period.',
    wrong: [
      'This bridge is the oldest structure that has survived since the Roman period.',
      'This bridge was rebuilt in the Roman period as one of the oldest structures.',
      'One of the oldest structures of the Roman period was built near this bridge.',
    ],
    explanation:
      '“… en eski yapılardan biridir” = one of the oldest structures. “the oldest” tek ve en eski demektir; diğer şıklar yeniden yapılmayı ya da köprünün yakınındaki başka bir yapıyı anlatıyor.',
  },
  {
    id: 'tr-en-09',
    direction: 'tr-en',
    sentence: 'Ne kadar çok okursan, kelime dağarcığın o kadar gelişir.',
    correct: 'The more you read, the more your vocabulary improves.',
    wrong: [
      'You read more because your vocabulary improves.',
      'If you read a lot, your vocabulary may not improve.',
      'The more your vocabulary improves, the less you need to read.',
    ],
    explanation:
      '“Ne kadar çok …, o kadar …” = The more …, the more … . Diğer şıklar sebep-sonucu ters çeviriyor, “gelişmeyebilir” diyor ya da orantıyı tersine kuruyor.',
  },
  {
    id: 'tr-en-10',
    direction: 'tr-en',
    sentence: 'Hükümetin yeni vergi politikası, küçük işletmeleri desteklemeyi amaçlıyor.',
    correct: "The government's new tax policy aims to support small businesses.",
    wrong: [
      "Small businesses support the government's new tax policy.",
      "The government's new tax policy was supported by small businesses.",
      'The government aims to tax small businesses with its new policy.',
    ],
    explanation:
      '“… desteklemeyi amaçlıyor” = aims to support. Diğer şıklarda destekleyen işletmeler oluyor, politika desteklenmiş oluyor ya da amaç vergilendirmeye dönüyor.',
  },
];
