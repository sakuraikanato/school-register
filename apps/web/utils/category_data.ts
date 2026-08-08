

export interface category {
  id: string
  svgPath: string,
  text: string,
  fontSize: number,
  url: string,
  
};

export const categories: category[] = [
  {
    id: "home",
    svgPath: "/image.png", 
    text: "ホーム", 
    fontSize: 24,
    url: `/staff`
  },
  {
    id: "students",
    svgPath: "/file.png", 
    text: "全生徒の成績一覧", 
    fontSize: 18,
    url: `/staff/students`
  },
  {
    id: "histories",
    svgPath: "/file.png", 
    text: "過去の成績一覧", 
    fontSize: 18,
    url: `/staff/histories`
  },
  {
    id: "courses",
    svgPath: "/file.png", 
    text: "科目成績一覧", 
    fontSize: 18,
    url: `/staff/courses`
  },
  {
    id: "csv",
    svgPath: "/folder.png", 
    text: "CSV読み込み", 
    fontSize: 18,
    url: `/csv`
  },
]