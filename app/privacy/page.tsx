import Image from "next/image";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white rounded-xl p-2 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Doodee Move Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  นโยบายความเป็นส่วนตัว
                </h1>
                <p className="text-green-100 mt-1">Privacy Policy</p>
              </div>
            </div>
            <p className="text-white text-sm opacity-90">
              Doodee Move - แอปพลิเคชันสำหรับการเดินทางอย่างยั่งยืน
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                บทนำ
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Doodee Move ให้ความสำคัญกับความเป็นส่วนตัวของคุณ 
                นโยบายความเป็นส่วนตัวฉบับนี้อธิบายว่าเราเก็บรวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณอย่างไร 
                เมื่อคุณใช้บริการ LINE Bot ของเรา
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ข้อมูลที่เราเก็บรวบรวม
              </h2>
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    1. ข้อมูลจาก LINE
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>LINE User ID (รหัสผู้ใช้ที่ไม่เปิดเผยตัวตน)</li>
                    <li>ชื่อที่แสดงผล (Display Name)</li>
                    <li>รูปโปรไฟล์ (หากคุณแชร์)</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    2. ข้อมูลการเดินทาง
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>ตำแหน่งเริ่มต้นและปลายทาง</li>
                    <li>ประเภทการเดินทาง (รถไฟฟ้า, รถบัส, เดิน, จักรยาน)</li>
                    <li>ระยะทางและเวลาที่ใช้เดินทาง</li>
                    <li>จำนวนคาร์บอนที่ลดได้</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    3. ข้อมูลที่ส่งจากผู้ใช้
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>รูปภาพยานพาหนะสาธารณะ (เมื่อใช้ฟีเจอร์สร้างแผนที่)</li>
                    <li>ตำแหน่งที่ถ่ายภาพ</li>
                    <li>คำอธิบายเกี่ยวกับยานพาหนะ</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                การใช้ข้อมูล
              </h2>
              <p className="text-gray-700 mb-4">
                เราใช้ข้อมูลของคุณเพื่อวัตถุประสงค์ดังต่อไปนี้:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-2xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    บันทึกและวิเคราะห์
                  </h3>
                  <p className="text-sm text-gray-600">
                    บันทึกประวัติการเดินทางและคำนวณคาร์บอนฟุตพริ้นท์
                  </p>
                </div>

                <div className="border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    ปรับปรุงบริการ
                  </h3>
                  <p className="text-sm text-gray-600">
                    พัฒนาและปรับปรุงประสบการณ์การใช้งาน
                  </p>
                </div>

                <div className="border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-2xl mb-2">🗺️</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    สร้างแผนที่
                  </h3>
                  <p className="text-sm text-gray-600">
                    รวบรวมข้อมูลขนส่งสาธารณะจากชุมชน
                  </p>
                </div>

                <div className="border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-2xl mb-2">📈</div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    แสดงสถิติ
                  </h3>
                  <p className="text-sm text-gray-600">
                    แสดงผลการใช้งานและผลกระทบต่อสิ่งแวดล้อม
                  </p>
                </div>
              </div>
            </section>

            {/* Data Protection */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                การรักษาความปลอดภัย
              </h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  เราใช้มาตรการรักษาความปลอดภัยทางเทคนิคและองค์กรที่เหมาะสมเพื่อปกป้องข้อมูลส่วนบุคคลของคุณจากการเข้าถึง 
                  การเปิดเผย การเปลี่ยนแปลง หรือการทำลายโดยไม่ได้รับอนุญาต
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>เข้ารหัสข้อมูลระหว่างการส่งผ่าน (HTTPS/TLS)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>จัดเก็บข้อมูลในฐานข้อมูลที่ปลอดภัย</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span>จำกัดการเข้าถึงข้อมูลเฉพาะผู้ที่จำเป็น</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                การแบ่งปันข้อมูล
              </h2>
              <p className="text-gray-700 leading-relaxed">
                เราไม่ขาย แลกเปลี่ยน หรือแบ่งปันข้อมูลส่วนบุคคลของคุณกับบุคคลที่สาม 
                ยกเว้นในกรณีดังต่อไปนี้:
              </p>
              <ul className="mt-4 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>เมื่อได้รับความยินยอมจากคุณ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>เพื่อปฏิบัติตามกฎหมายหรือคำสั่งศาล</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>เพื่อปกป้องสิทธิและความปลอดภัยของเราหรือผู้อื่น</span>
                </li>
              </ul>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                สิทธิของคุณ
              </h2>
              <p className="text-gray-700 mb-4">
                คุณมีสิทธิดังต่อไปนี้เกี่ยวกับข้อมูลส่วนบุคคลของคุณ:
              </p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-bold">1.</span>
                  <div>
                    <span className="font-semibold text-gray-900">สิทธิในการเข้าถึง:</span>
                    <span className="text-gray-700"> ขอเข้าถึงและรับสำเนาข้อมูลของคุณ</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-bold">2.</span>
                  <div>
                    <span className="font-semibold text-gray-900">สิทธิในการแก้ไข:</span>
                    <span className="text-gray-700"> แก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-bold">3.</span>
                  <div>
                    <span className="font-semibold text-gray-900">สิทธิในการลบ:</span>
                    <span className="text-gray-700"> ขอให้ลบข้อมูลของคุณ</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600 font-bold">4.</span>
                  <div>
                    <span className="font-semibold text-gray-900">สิทธิในการถอนความยินยอม:</span>
                    <span className="text-gray-700"> ถอนความยินยอมที่ให้ไว้</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookie Policy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                คุกกี้และเทคโนโลยีติดตาม
              </h2>
              <p className="text-gray-700 leading-relaxed">
                เว็บไซต์ของเราอาจใช้คุกกี้และเทคโนโลยีที่คล้ายกันเพื่อปรับปรุงประสบการณ์การใช้งานของคุณ 
                คุณสามารถจัดการการตั้งค่าคุกกี้ผ่านเบราว์เซอร์ของคุณได้
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ระยะเวลาการเก็บรักษาข้อมูล
              </h2>
              <p className="text-gray-700 leading-relaxed">
                เราจะเก็บรักษาข้อมูลส่วนบุคคลของคุณตдо้นที่จำเป็นเพื่อบรรลุวัตถุประสงค์ที่ระบุในนโยบายนี้ 
                หรือตามที่กฎหมายกำหนด เมื่อคุณลบบัญชีหรือถอนความยินยอม 
                เราจะลบหรือทำให้ข้อมูลของคุณไม่สามารถระบุตัวตนได้ภายในระยะเวลาที่เหมาะสม
              </p>
            </section>

            {/* Children Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ความเป็นส่วนตัวของเด็ก
              </h2>
              <p className="text-gray-700 leading-relaxed">
                บริการของเรามีวัตถุประสงค์สำหรับผู้ใช้ที่มีอายุ 13 ปีขึ้นไป 
                เราไม่เก็บรวบรวมข้อมูลส่วนบุคคลจากเด็กที่มีอายุต่ำกว่า 13 ปีโดยเจตนา 
                หากคุณทราบว่าเด็กได้ให้ข้อมูลส่วนบุคคลแก่เรา กรุณาติดต่อเรา
              </p>
            </section>

            {/* Policy Changes */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                การเปลี่ยนแปลงนโยบาย
              </h2>
              <p className="text-gray-700 leading-relaxed">
                เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว 
                การเปลี่ยนแปลงใดๆ จะมีผลทันทีเมื่อเรานำเผยแพร่นโยบายที่แก้ไขบนหน้านี้ 
                เราขอแนะนำให้คุณตรวจสอบนโยบายเป็นประจำ
              </p>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ติดต่อเรา
              </h2>
              <p className="text-gray-700 mb-4">
                หากคุณมีคำถามหรือข้อกังวลเกี่ยวกับนโยบายความเป็นส่วนตัวนี้หรือต้องการใช้สิทธิของคุณ 
                กรุณาติดต่อเราผ่าน:
              </p>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">📧</span>
                  <span className="font-medium">Email:</span>
                  <a href="mailto:contact@doodee-future.com" className="text-green-600 hover:text-green-700">
                    contact@doodee-future.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🌐</span>
                  <span className="font-medium">Website:</span>
                  <a href="https://move.doodee-future.com" className="text-green-600 hover:text-green-700">
                    move.doodee-future.com
                  </a>
                </div>
              </div>
            </section>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500 pt-6 border-t border-gray-200">
              <p>อัพเดทล่าสุด: 6 มีนาคม 2026</p>
              <p className="mt-1">Last Updated: March 6, 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
