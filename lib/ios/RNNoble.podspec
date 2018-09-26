
Pod::Spec.new do |s|
  s.name         = "RNNoble"
  s.version      = "1.0.0"
  s.summary      = "RNNoble"
  s.description  = <<-DESC
                  RNNoble
                   DESC
  s.homepage     = ""
  s.license      = "MIT"
  # s.license      = { :type => "MIT", :file => "FILE_LICENSE" }
  s.author             = { "author" => "author@domain.cn" }
  s.platform     = :ios, "7.0"
  s.source       = { :git => "https://github.com/author/RNNoble.git", :tag => "master" }
  s.source_files  = "RNNoble/**/*.{h,m}"
  s.requires_arc = true


  s.dependency "React"
  s.dependency "RxBluetoothKit"

end

  